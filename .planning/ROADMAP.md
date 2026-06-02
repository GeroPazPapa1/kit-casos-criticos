# Roadmap: Operativo Frío

**Milestone:** v1.0 — Mapa operativo en producción
**Total phases:** 4
**Requirements covered:** 17/17

---

## Phases

- [x] **Phase 1: Python Pipeline** - Extract KoBoToolbox records, parse coordinates, hash DNI, write Parquet — Complete 2026-06-01
- [x] **Phase 2: JSON Exporter** - Read Parquet, run DNI linter, atomically write entregas.json + meta.json — Complete 2026-06-01
- [x] **Phase 3: React SPA** - Leaflet map with commune boundaries, delivery markers, popups, mobile layout — Complete 2026-06-02
- [ ] **Phase 4: Deploy** - deploy.sh one-command deploy to Vercel with SPA routing rewrite

---

## Phase Details

### Phase 1: Python Pipeline
**Goal**: The pipeline reliably extracts all KoBoToolbox submissions, sanitizes PII, and produces a clean Parquet file ready for export.
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05
**Success criteria**:
1. Running the pipeline against a live KoBoToolbox form returns all records — not truncated at 100 — verified by comparing `len(results)` against `data["count"]`
2. The output `data/entregas.parquet` exists and contains `lat`/`lon` float columns with values inside the CABA bounding box
3. The output Parquet has no `dni` column in any form; the linter exits 0 on a clean file and exits non-zero if a `dni` column is detected
4. Running the pipeline against an empty form produces a zero-row Parquet without error
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Fix .env URL and create requirements.txt
- [x] 01-02-PLAN.md — Write pipeline.py (fetch, transform, hash DNI, write Parquet, linter)

**Wave 1** — 01-01: env/deps setup
**Wave 2** *(blocked on Wave 1)* — 01-02: pipeline.py full ETL + linter

Cross-cutting constraints:
- Raw DNI must be hashed inside `hash_dni()` before any other assignment
- `sys.exit(1)` on env var missing or linter failure

### Phase 2: JSON Exporter
**Goal**: The exporter safely converts the Parquet into static JSON files the frontend can consume, with atomic writes and a hard abort on any DNI leak.
**Depends on**: Phase 1
**Requirements**: EXPO-01, EXPO-02, EXPO-03, EXPO-04
**Success criteria**:
1. `Dashboard/public/data/dist/entregas.json` exists and contains one object per delivery row with no `dni` field at any nesting level
2. `Dashboard/public/data/dist/meta.json` exists and contains a valid ISO timestamp and an integer record count matching the Parquet row count
3. Interrupting the export mid-write leaves the previous `dist/` intact — readers never see a partial file
4. Injecting a `dni` column into the Parquet before running the exporter causes the process to abort with a non-zero exit code before any file is written
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Write exporter.py (Parquet → JSON, DNI linter gate, atomic write)
- [x] 02-02-PLAN.md — Write deploy.sh (pipeline.py && exporter.py orchestration)

**Wave 1** — 02-01 and 02-02 run in parallel (no shared files)

### Phase 3: React SPA
**Goal**: Operators can open the dashboard and immediately see all delivery locations on a map of CABA communes, tap any point for details, and use it on a phone.
**Depends on**: Phase 2
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06
**Success criteria**:
1. The map loads and renders the 15 CABA commune boundary polygons as a visible GeoJSON layer over the base tile map
2. Every delivery record from `entregas.json` appears as a marker at its correct GPS coordinates; no markers are placed in the Atlantic Ocean
3. Clicking a marker opens a popup showing nombre, apellido, género, edad, observaciones — with no DNI value present anywhere in the popup
4. The header displays the total kit count and the last-updated timestamp sourced from `meta.json`
5. At 375px viewport width the map is fully navigable (pan, zoom) and the header remains readable without horizontal overflow
**Plans:** 4 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Vite scaffold + deps install + Tailwind v3 config + vite.config.ts + Comunas.json copy
- [x] 03-02-PLAN.md — TypeScript types (domain.ts, meta.ts) + api.ts + useEntregas hook
- [x] 03-03-PLAN.md — main.tsx (CSS imports, icon fix) + App.tsx + Header.tsx + MapView.tsx
- [x] 03-04-PLAN.md — Automated gates (7 checks) + human visual verification checkpoint

**Wave 1** — 03-01: scaffold and toolchain
**Wave 2** *(blocked on Wave 1)* — 03-02: types and data layer
**Wave 3** *(blocked on Wave 2)* — 03-03: UI components
**Wave 4** *(blocked on Wave 3)* — 03-04: verification and human sign-off

Cross-cutting constraints:
- `dni_hash` must NOT appear in any popup JSX (privacy gate, ASVS L1)
- Three CSS imports required in main.tsx: leaflet, MarkerCluster, MarkerCluster.Default (in that order)
- Tailwind must be pinned to @3: `npm install -D tailwindcss@3 postcss autoprefixer`

### Phase 4: Deploy
**Goal**: Any team member can push the dashboard to production with a single command and reach it via a stable Vercel URL without 404 errors on direct navigation.
**Depends on**: Phase 3
**Requirements**: DEPLOY-01, DEPLOY-02
**Success criteria**:
1. Running `bash deploy.sh` from the project root completes without manual intervention and outputs a live Vercel URL
2. Navigating directly to any route under the Vercel URL (e.g. `/map`) returns the SPA index — not a 404
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Create Dashboard/vercel.json (catch-all rewrite) + extend deploy.sh to full pipeline
- [ ] 04-02-PLAN.md — First-time vercel link setup + end-to-end deploy smoke test

**Wave 1** — 04-01: code changes (autonomous)
**Wave 2** *(blocked on Wave 1)* — 04-02: vercel link + live deploy verification (human)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Python Pipeline | 2/2 | Complete | 2026-06-01 |
| 2. JSON Exporter | 2/2 | Complete | 2026-06-01 |
| 3. React SPA | 4/4 | Complete | 2026-06-02 |
| 4. Deploy | 1/2 | In progress | - |
