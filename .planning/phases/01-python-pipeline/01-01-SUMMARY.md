---
phase: 01-python-pipeline
plan: "01"
subsystem: pipeline-config
tags: [env, config, gitignore, requirements, security]
dependency_graph:
  requires: []
  provides: [correct-env-for-pipeline, requirements-txt, gitignore-coverage]
  affects: [01-02-pipeline]
tech_stack:
  added: [python-dotenv>=1.0, requests>=2.32, polars>=1.0]
  patterns: [dotenv-no-quotes, gitignore-secrets]
key_files:
  created: [requirements.txt]
  modified: [.env, .gitignore]
decisions:
  - "Store KoBoToolbox API token in .env without quotes or trailing comma (python-dotenv convention)"
  - "Use KoBoToolbox v2 API data URL (not browser UI URL) to receive JSON responses"
  - ".env is not committed — only requirements.txt (no secrets) enters git history"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  files_changed: 3
---

# Phase 01 Plan 01: Fix env configuration Summary

Fixed broken environment configuration that would have caused pipeline.py to silently fail by receiving HTML instead of JSON from the KoBoToolbox API, and added gitignore coverage for secrets and runtime artifacts.

## What Was Done

### Task 1 — Fix .env and create requirements.txt

**Problem 1 — Trailing comma in KEY_OP_FRIO:**
The original value was `KEY_OP_FRIO='67963ffdab8038e815308e8b20d57603d9b1e0ad',` — python-dotenv would have read the comma as part of the token value, causing every API request to fail with 401 Unauthorized.

**Fix:** Rewrote to `KEY_OP_FRIO=67963ffdab8038e815308e8b20d57603d9b1e0ad` (no quotes, no trailing comma — python-dotenv conventional format).

**Problem 2 — Browser UI URL instead of v2 API URL:**
The original value was `URL_OP_FRIO='https://kf.kobotoolbox.org/#/forms/azkoLnjDQRcMwvmMhXuNHw'` — this is the KoBoToolbox web UI URL that returns HTML, not the data API endpoint. Any `requests.get()` call against it would have returned HTML, causing a JSON parse error or silent empty dataset.

**Fix:** Replaced with `URL_OP_FRIO=https://kf.kobotoolbox.org/api/v2/assets/azkoLnjDQRcMwvmMhXuNHw/data/` — the direct v2 API data URL. Asset UID `azkoLnjDQRcMwvmMhXuNHw` preserved.

**requirements.txt created** with exactly three runtime dependencies (no forbidden libraries):
- `requests>=2.32`
- `polars>=1.0`
- `python-dotenv>=1.0`

### Task 2 — Update .gitignore

Added `.env` and `data/` to .gitignore (preserving existing `.planning/` entry):
- `.env` — contains KEY_OP_FRIO API token; must never enter git history (threat T-01-01)
- `data/` — runtime artifact directory for Parquet files with hashed PII

## Verification Results

Both automated verifications passed:

```
OK: .env values correct
OK: .gitignore covers data/ and .env
PASS: .env is correctly formatted for pipeline.py
```

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-01-01 | Mitigated | .env added to .gitignore; token never staged in this execution |
| T-01-02 | Accepted | requirements.txt committed — no secrets, public dependency list |
| T-01-03 | Mitigated | Exact v2 API URL pinned; wrong URL causes immediate HTTP error |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | ca6d0c9 | feat(phase-01): fix env config and add requirements.txt |
| Task 2 | 5b134de | chore: add .env and data/ to .gitignore |

## Self-Check: PASSED

- [x] `.env` exists and python-dotenv reads KEY without trailing comma
- [x] `.env` URL_OP_FRIO contains `/api/v2/assets/` and ends with `/data/`
- [x] `requirements.txt` exists with polars>=1.0, requests>=2.32, python-dotenv>=1.0
- [x] `.gitignore` contains `.env` and `data/` entries
- [x] `.env` is NOT tracked by git (shows ignored after Task 2)
- [x] Commits ca6d0c9 and 5b134de exist in git log
