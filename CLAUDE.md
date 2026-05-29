<!-- GSD:project-start source:PROJECT.md -->
## Project

**Operativo Frío — Mapa de Entregas de Kits**

Pipeline de datos + dashboard React/TS que extrae registros de entrega de kits de invierno desde KoBoToolbox, los almacena localmente como Parquet (luego en Neon PostgreSQL), y los muestra en un mapa interactivo con los límites de comunas de CABA y los puntos exactos de cada entrega.

**Core Value:** Que cualquier operador pueda ver en un mapa dónde se entregaron kits y cuántas entregas hubo por comuna, en base a datos reales del formulario Kobo.

### Constraints

- **Privacy**: DNI nunca en claro en ningún artefacto de salida — SHA-256 + salt obligatorio
- **Stack**: Python 3.10+ para pipeline, React + TypeScript para frontend (igual que Kobo Intervenciones)
- **Storage**: Local .parquet primero, Neon PostgreSQL después (no cambiar arquitectura base)
- **Deploy**: Vercel para el frontend
- **Geo data**: Usar los shapefiles/GeoJSON de comunas ya disponibles en el workspace
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Python Pipeline
### KoBoToolbox Extraction
- KoBoToolbox v1 API is deprecated and decommissioning June 2026. The project constraints already reference `KEY_OP_FRIO` and `URL_OP_FRIO` — store the full v2 asset data URL in the env var and call it directly.
- Pagination: KoBoToolbox returns `next` URLs in the response envelope. Implement a simple `while next_url` loop.
- `requests` is already a dependency in virtually every Python project; adding `koboextractor` is unnecessary complexity.
- `requests >= 2.32` (latest stable; security fixes in 2.32.x series)
- `python-dotenv >= 1.0` for `.env` loading
### Data Storage (Parquet)
- `df.write_parquet("output.parquet")` — one call, no import of pyarrow separately
- `pl.scan_parquet("output.parquet").filter(...).collect()` — lazy evaluation with predicate pushdown when querying locally
- Strict schema enforcement catches malformed API responses early
- No mutable DataFrame footgun — transformations return new frames
- `polars >= 1.0` (stable 1.x series, released mid-2024, API is stable)
- Do not use `fastparquet` — it lags behind pyarrow/polars in feature parity and is rarely the recommended choice in 2025.
- Do not use pickle for local storage — no schema, not portable, security risk.
### Neon PostgreSQL
- Neon's own docs list psycopg3 as "the modern, synchronous database adapter" and psycopg2 as "older, maintained for backwards compatibility."
- psycopg3 supports binary protocol (faster large batch inserts) and pipeline mode (reduced round trips).
- psycopg2 has no active feature development — it will work but is a dead end.
- Neon explicitly requires SQLAlchemy >= 2.0.33 to avoid idle connection reuse bugs that cause SSL EOF errors on scale-to-zero compute.
- SQLAlchemy's `pool_pre_ping=True` and `pool_recycle` make Neon's serverless scale-to-zero transparent.
- Provides table schema definition and migration pathway (via Alembic later if needed).
- `psycopg[binary] >= 3.1`
- `sqlalchemy >= 2.0.33`
- Do not use `asyncpg` — the pipeline is a batch script, not an async web server. Async adds complexity with no benefit here.
- Do not use `psycopg2-binary` for new code — deprecated path.
## Frontend (React/TS)
### Map Library
| Criterion | react-leaflet | MapLibre GL JS |
|-----------|--------------|----------------|
| Bundle size | ~42 KB gzipped | ~290 KB gzipped |
| GeoJSON polygons | Native `<GeoJSON>` component | Requires source + layer setup |
| Point markers | `<Marker>` + `<Popup>` — dead simple | `addSource` + `addLayer` imperative |
| TypeScript | `@types/leaflet` well-maintained | Built-in TS types |
| Tile server required | Optional (OSM default) | Required for basemap |
| Learning curve | Low | Medium-High |
| Use case fit | Simple choropleth + point overlay | 3D, vector tiles, massive datasets |
- `leaflet >= 1.9.4`
- `react-leaflet >= 4.2.1` (v4 is the current stable; requires React 18)
### Build Tool
- Sub-second dev server startup (native ESM, no bundling in dev)
- Native TypeScript support — no extra config
- Automatic Vercel detection (build command: `vite build`, output: `dist/`)
- Smaller production bundles via Rollup
- First-class support for `import.meta.env` for environment variables (prefix `VITE_`)
- `vite >= 5.0`
- `@vitejs/plugin-react >= 4.0` (uses Babel; alternatively `@vitejs/plugin-react-swc` for faster builds with SWC)
- Node.js >= 20 (LTS)
### Deployment
## What NOT to Use
| Library | Reason |
|---------|--------|
| `koboextractor` | Minimally maintained (3 tags, 8 commits), no active development; thin wrapper with no real benefit over direct `requests` |
| `kobo-connect` | A webhook relay server (Docker), not a data extraction library |
| `asyncpg` (for this pipeline) | Async adds complexity with zero benefit in a synchronous batch pipeline |
| `psycopg2` | Dead-end; no feature development; Neon's own docs call it "older" and secondary |
| `fastparquet` | Lags pyarrow/polars in correctness and features; rarely recommended in 2025 |
| `pickle` for storage | No schema, not portable, security risk |
| `MapLibre GL JS` | 7x heavier bundle, imperative API, requires tile server — overkill for 15 polygon + point overlay |
| `Deck.gl` | GPU visualization layer for millions of points; not needed here |
| `Create React App` | Officially deprecated, no active maintenance |
| KoBoToolbox API v1 | Deprecated, decommissioning June 2026 |
## Confidence Levels
| Decision | Confidence | Basis |
|----------|------------|-------|
| `requests` for KoBoToolbox | HIGH | Official KoBoToolbox API docs; v1 deprecation confirmed; koboextractor maintenance confirmed low |
| `polars` for Parquet | HIGH | Official Polars docs; multiple benchmark sources; greenfield project |
| `psycopg3` + `SQLAlchemy 2.0.33+` | HIGH | Official Neon docs explicitly cite these versions and required config |
| `react-leaflet` over MapLibre | HIGH | Bundle size verified; feature fit confirmed; multiple 2025 comparison sources |
| `Vite 5.x` | HIGH | CRA deprecated (official); Vite is community standard; Vercel auto-detection confirmed |
| Vercel zero-config for Vite | HIGH | Official Vercel docs; no edge cases for this SPA pattern |
## Sources
- [KoBoToolbox API documentation](https://support.kobotoolbox.org/api.html) — v1 deprecation, authentication method
- [Neon Python connection guide](https://neon.com/docs/guides/python) — psycopg3 as modern adapter, psycopg2 as legacy
- [Neon SQLAlchemy guide](https://neon.com/docs/guides/sqlalchemy) — SQLAlchemy 2.0.33+ requirement, pool_pre_ping, pool_recycle
- [koboextractor on PyPI](https://pypi.org/project/koboextractor/) — version 0.2.1, maintenance status
- [koboextractor on GitHub](https://github.com/heiko-r/koboextractor) — 8 commits, 3 tags
- [Polars Parquet user guide](https://docs.pola.rs/user-guide/io/parquet/) — native read/write API
- [Pandas vs Polars 2025 (DEV Community)](https://dev.to/dataformathub/pandas-vs-polars-why-the-2025-evolution-changes-everything-5ad1)
- [psycopg2 vs psycopg3 benchmark (TigerData)](https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark)
- [Map libraries comparison 2025/2026 (Geoapify)](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/)
- [MapLibre GL JS vs Leaflet (jawg.io)](https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/)
- [Best JavaScript map libraries 2026 (js-maps.com)](https://js-maps.com/best-javascript-map-libraries/)
- [Why stop using CRA, start using Vite 2025 (DEV Community)](https://dev.to/simplr_sh/why-you-should-stop-using-create-react-app-and-start-using-vite-react-in-2025-4d21)
- [Vite on Vercel (official Vercel docs)](https://vercel.com/docs/frameworks/frontend/vite)
- [Vite static deploy guide (official Vite docs)](https://vite.dev/guide/static-deploy)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
