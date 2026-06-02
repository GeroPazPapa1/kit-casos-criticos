---
phase: 03-react-spa
plan: 02
subsystem: frontend
tags: [typescript, types, fetch, hooks, data-layer]
dependency_graph:
  requires: [03-01]
  provides: [Entrega interface, Meta interface, fetchJson utility, useEntregas hook]
  affects: [03-03, 03-04]
tech_stack:
  added: []
  patterns:
    - Discriminated union state machine (loading/error/ok)
    - fetchJson<T> generic fetch wrapper with URL in error message
    - Promise.all parallel fetch with cancellation guard
    - @ path alias in tsconfig.app.json (paths + baseUrl + ignoreDeprecations for TS6)
key_files:
  created:
    - Dashboard/src/types/domain.ts
    - Dashboard/src/types/meta.ts
    - Dashboard/src/lib/api.ts
    - Dashboard/src/hooks/useEntregas.ts
  modified:
    - Dashboard/tsconfig.app.json
decisions:
  - "Entrega has 10 fields matching Phase 2 JSON output: id, lat, lon, nombre, apellido, genero, edad, observaciones, dni_hash, submission_time"
  - "dni_hash declared non-nullable string per Phase 2 D-03; comment explicitly forbids rendering in UI"
  - "BASE = './data/dist' with ./ prefix for Vercel sub-path compatibility"
  - "tsconfig.app.json paths alias added (Rule 3 auto-fix — TS6 requires explicit paths for @ alias)"
metrics:
  duration: "6 minutes"
  completed: "2026-06-02"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 3 Plan 2: TypeScript Type Layer + Data Fetching Hook Summary

**One-liner:** TypeScript data layer — Entrega (10 fields) and Meta interfaces, fetchJson<T> generic fetch wrapper, and useEntregas loading/error/ok state machine hook with cancellation guard fetching from `./data/dist`.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create type files (domain.ts and meta.ts) | 8332c7f | Dashboard/src/types/domain.ts, Dashboard/src/types/meta.ts |
| 2 | Create api.ts and useEntregas hook | fdd6c39 | Dashboard/src/lib/api.ts, Dashboard/src/hooks/useEntregas.ts, Dashboard/tsconfig.app.json |

## Verification Results

| Check | Result |
|-------|--------|
| `export interface Entrega` in domain.ts | PASS |
| `dni_hash: string` non-nullable in domain.ts | PASS |
| `submission_time: string \| null` in domain.ts | PASS |
| Exactly 10 fields in Entrega | PASS (id, lat, lon, nombre, apellido, genero, edad, observaciones, dni_hash, submission_time) |
| `export interface Meta` in meta.ts | PASS |
| `timestamp: string` in meta.ts | PASS |
| `total: number` in meta.ts | PASS |
| `fetchJson` in api.ts | PASS |
| `throw new Error` with URL in api.ts | PASS |
| `const BASE = './data/dist'` in useEntregas.ts | PASS |
| `let cancelled = false` in useEntregas.ts | PASS |
| `Promise.all(` in useEntregas.ts | PASS |
| `if (!cancelled)` in useEntregas.ts | PASS |
| imports from `'@/lib/api'` (not relative) | PASS |
| imports from `'@/types/domain'` (not relative) | PASS |
| `npm run build` exits 0 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Added @ path alias to tsconfig.app.json**
- **Found during:** Task 2
- **Issue:** Vite 8 scaffolds with TypeScript 6. The `react-ts` template in TS6 no longer auto-includes `paths` in `tsconfig.app.json`. Without `paths: { "@/*": ["./src/*"] }`, `tsc -b` emits `TS2307: Cannot find module '@/lib/api'` errors even though Vite itself resolves the alias correctly at runtime.
- **Fix:** Added `baseUrl: "."`, `paths: { "@/*": ["./src/*"] }`, and `ignoreDeprecations: "6.0"` to `tsconfig.app.json`. The `ignoreDeprecations` silences the TS6 deprecation warning on `baseUrl` (required because `paths` needs a `baseUrl` anchor in TS6 bundler mode).
- **Files modified:** Dashboard/tsconfig.app.json
- **Commit:** fdd6c39

## Known Stubs

None — these are pure type/utility files with no UI rendering. No stubs introduced.

## Threat Surface Scan

**T-03-05 mitigation verified:** `dni_hash` is declared in `Entrega` with comment: "NEVER render in UI". No JSX in this plan. Wave 3 grep check (Wave 3 acceptance criteria) will verify zero `dni_hash` matches in popup JSX.

No new security-relevant surface introduced. All files are compile-time types and a browser-internal fetch utility. No network endpoints, auth paths, or trust boundaries added.

## Self-Check: PASSED

- [x] Dashboard/src/types/domain.ts exists — FOUND
- [x] Dashboard/src/types/meta.ts exists — FOUND
- [x] Dashboard/src/lib/api.ts exists — FOUND
- [x] Dashboard/src/hooks/useEntregas.ts exists — FOUND
- [x] Commit 8332c7f exists — FOUND
- [x] Commit fdd6c39 exists — FOUND
- [x] npm run build exits 0 — CONFIRMED
