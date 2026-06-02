---
phase: 04-deploy
plan: 02
subsystem: infra
tags: [vercel, deploy, spa-routing]

requires:
  - phase: 04-01
    provides: Dashboard/vercel.json catch-all rewrite + extended deploy.sh

provides:
  - Live Vercel deployment at https://op-frio.vercel.app
  - Dashboard/.vercel/project.json committed for team sharing
  - End-to-end smoke test confirmed: DEPLOY-01 + DEPLOY-02 both satisfied

affects: []

tech-stack:
  added: [vercel-cli]
  patterns: [vercel link once, commit project.json, then vercel --prod is non-interactive]

key-files:
  created: [Dashboard/.vercel/project.json]
  modified: [Dashboard/.gitignore]

key-decisions:
  - "Project name: op-frio (lowercase required by Vercel — OP-frio rejected)"
  - "Dashboard/.gitignore changed from blanket .vercel/ exclusion to .vercel/output/ + .vercel/.vc-config.json so project.json gets tracked"
  - "Stable alias: https://op-frio.vercel.app (Vercel auto-assigned)"

patterns-established:
  - "vercel link once per machine, commit project.json — all team members share same projectId/orgId"

requirements-completed: [DEPLOY-01, DEPLOY-02]

duration: ~15min
completed: 2026-06-02
---

# Phase 4 Plan 02: Vercel Link + Smoke Test Summary

**Full pipeline deploy to https://op-frio.vercel.app — bash deploy.sh one-command, /map returns SPA not 404**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-06-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Vercel project linked as `op-frio` under `facundo-cornets-projects`
- `Dashboard/.vercel/project.json` committed — team can deploy without re-linking
- `bash deploy.sh` ran end-to-end: ETL (0 records) → JSON export → Vite build → Vercel prod deploy
- Live URL confirmed: https://op-frio.vercel.app
- Direct navigation to `/map` returns SPA (200, not 404) — DEPLOY-02 verified

## Task Commits

1. **Task 1: vercel link** — `f0cd679` (chore: link Vercel project, unblock project.json from gitignore)
2. **Task 2: smoke test** — confirmed manually in browser

## Files Created/Modified

- `Dashboard/.vercel/project.json` — projectId + orgId for team-shared deploy target
- `Dashboard/.gitignore` — replaced blanket `.vercel` ignore with specific exclusions to allow project.json

## Decisions Made

- Vercel rejected `OP-frio` (uppercase) — used `op-frio`
- `.gitignore` needed rework: blanket `.vercel/` prevents git from tracking `project.json` even with negation; switched to explicit path exclusions for Vercel build artifacts only

## Deviations from Plan

### Auto-fixed Issues

**1. Dashboard/.gitignore blocked project.json commit**
- **Found during:** Task 1 (vercel link + commit)
- **Issue:** Original `.gitignore` had `.vercel` which silently ignored `project.json`; git refused `git add` even after negation pattern added (directory-level ignore blocks negations for files within it)
- **Fix:** Replaced `.vercel` with `.vercel/output/` and `.vercel/.vc-config.json` — tracks `project.json`, ignores Vercel build artifacts
- **Files modified:** `Dashboard/.gitignore`
- **Committed in:** f0cd679

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** Necessary correction — plan D-04 requires project.json to be tracked. No scope creep.

## Issues Encountered

- Project name casing: `OP-frio` rejected by Vercel (must be lowercase). Used `op-frio`.

## Next Phase Readiness

Phase 4 is the final phase. All ROADMAP requirements satisfied.

- DEPLOY-01: `bash deploy.sh` runs full pipeline unattended ✓
- DEPLOY-02: `/map` direct navigation returns SPA ✓
- Live URL: https://op-frio.vercel.app

---
*Phase: 04-deploy*
*Completed: 2026-06-02*
