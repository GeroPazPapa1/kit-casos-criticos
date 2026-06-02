---
phase: 04-deploy
plan: "01"
subsystem: deploy
tags: [vercel, deploy, spa, bash]
dependency_graph:
  requires: []
  provides: [vercel.json-catch-all, full-pipeline-deploy-script]
  affects: [Dashboard/vercel.json, deploy.sh]
tech_stack:
  added: []
  patterns: [subshell-cd, vercel-spa-rewrite, bash-pipeline-chain]
key_files:
  created:
    - Dashboard/vercel.json
  modified:
    - deploy.sh
decisions:
  - "No framework hint in vercel.json -- Vercel auto-detects Vite from package.json; avoids conflict with vercel link"
  - "Subshell (cd Dashboard && ...) for npm run build and vercel --prod -- keeps caller working directory unchanged"
  - "Explicit && chaining kept alongside set -euo pipefail for clarity"
metrics:
  duration: "40s"
  completed: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
requirements:
  - DEPLOY-01
  - DEPLOY-02
---

# Phase 4 Plan 01: Deploy Config (vercel.json + deploy.sh) Summary

**One-liner:** SPA catch-all rewrite in vercel.json and full ETL-to-production pipeline in deploy.sh using subshell cd pattern.

## What Was Built

- `Dashboard/vercel.json`: Vercel rewrite config that routes all paths to `/index.html`, satisfying DEPLOY-02. Enables direct navigation to any React Router path without a 404.
- `deploy.sh` (extended): Appended `&& (cd Dashboard && npm run build && vercel --prod)` to the existing last line. The subshell pattern keeps the caller's working directory unchanged after the script returns (D-02).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Dashboard/vercel.json | 6df9efd | Dashboard/vercel.json (created) |
| 2 | Extend deploy.sh to full pipeline | 5aef880 | deploy.sh (last line replaced) |

## Verification Results

1. `Dashboard/vercel.json` exists: True
2. Valid JSON: `node -e "require('./Dashboard/vercel.json')"` -> OK
3. Contains `/(.*)`  catch-all: confirmed
4. `deploy.sh` contains `vercel --prod`: confirmed
5. `deploy.sh` contains `(cd Dashboard`: confirmed (subshell pattern)
6. `deploy.sh` bash syntax check: OK

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - no new security surface introduced beyond what is documented in the plan threat model (T-04-01 through T-04-03).

## Self-Check: PASSED

- `Dashboard/vercel.json` found and valid JSON
- Commit `6df9efd` exists (Task 1)
- Commit `5aef880` exists (Task 2)
- `set -euo pipefail` present in deploy.sh
- No bare top-level `cd Dashboard` in deploy.sh (only inside subshell)
