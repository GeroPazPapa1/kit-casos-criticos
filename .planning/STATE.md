# Project State

## Project Reference
See: .planning/PROJECT.md

**Core value:** Que cualquier operador pueda ver en un mapa dónde se entregaron kits y cuántas entregas hubo por comuna, en base a datos reales del formulario Kobo.
**Current phase:** Phase 3 — React SPA
**Status:** Ready to plan

---

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Python Pipeline | Complete (2026-06-01) |
| 2 | JSON Exporter | Complete (2026-06-01) |
| 3 | React SPA | Not started |
| 4 | Deploy | Not started |

**Progress:** [####------] 50% (2/4 phases complete)

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases complete | 2/4 |
| Requirements mapped | 17/17 |
| Plans complete | 4/4 (Phases 1–2 complete) |

---

## Accumulated Context

### Key Decisions
- Parquet local before Neon: iteración rápida sin depender de DB cloud en etapa inicial
- React + TS para mapa: misma stack que Kobo Intervenciones, reutilizar patrones
- SHA-256 + salt por registro (os.urandom(16)): dato sensible, no salt global (brute-forceable con ~40M DNIs argentinos)
- Comunas como GeoJSON: formato nativo para Leaflet, más simple que SHP en frontend

### Critical Pitfalls (from research)
- KoBoToolbox pagination default is 100 records since March 2026 — must use `while url:` loop following `data["next"]`
- Raw DNI must be hashed in the same function that reads from API — never log or write before hash
- **CORRECTED (discuss-phase 2026-06-01):** Form uses `_geolocation` (system array `[lat, lon]`), NOT a custom geopoint question. Parse with `record["_geolocation"][0]` / `[1]`, NOT `.split()`
- Coordinate order: KoBoToolbox returns (lat, lon) but GeoJSON needs [lon, lat] — swap or markers land in the Atlantic
- Comunas.json CRS **confirmed WGS84** (verified from comunas/comunas.prj) — no reprojection needed

### Reuse from Kobo Intervenciones
- `lib/api.ts` fetchJson<T> pattern
- Polars Parquet write workaround (critical on Windows)
- DNI hash + linter logic
- Atomic JSON write pattern (dist.new/ → rename → dist/)
- vite.config.ts with `base: './'`
- HashRouter setup in App.tsx
- deploy.sh 3-step orchestration
- Comunas.json (verify WGS84 first)

### Open Questions
- ~~Are KoBoToolbox field variable names finalized?~~ **RESOLVED 2026-06-01** — see 01-CONTEXT.md
- ~~Is Comunas.json in WGS84?~~ **RESOLVED 2026-06-01** — confirmed WGS84 from .prj file
- Expected submission volume? Under ~5,000 static JSON is fine; above ~20,000 Neon migration moves up.
- Pipeline run frequency? Manual on-demand assumed; CI cron design deferred.

### TODOs
- (none yet)

### Blockers
- (none)

---

## Session Continuity

**Last session:** 2026-06-01 — Phase 3 context gathered (react-leaflet-cluster, static commune polygons, CARTO dark, single-page no router)
**Resume file:** .planning/phases/03-react-spa/03-CONTEXT.md
**Next action:** `/gsd-plan-phase 3` — plan React SPA implementation
