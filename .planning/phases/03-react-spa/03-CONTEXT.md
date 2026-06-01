# Phase 3: React SPA - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the `Dashboard/` Vite + React + TypeScript SPA: a single-page map dashboard where operators can see all delivery locations on CABA commune boundaries, tap any marker for delivery details, and navigate the map on mobile. Output is a static SPA served from `Dashboard/` that reads `public/data/dist/entregas.json` and `public/data/dist/meta.json` (written by Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Marker Clustering (MAP-05)
- **D-01:** Use `react-leaflet-cluster` (wraps `leaflet.markercluster`). Most widely used integration with react-leaflet v4. Drop-in `<MarkerClusterGroup>` wrapper, zero extra config.
- **D-02:** Default `leaflet.markercluster` cluster circle visual style (green/yellow/red circles with count). No custom CSS or icon overrides needed.

### Commune Polygons (MAP-01)
- **D-03:** Static styled borders only — no hover, click, or tooltip interactivity. Polygons serve as geographic reference only.
- **D-04:** Border style: `color: '#94a3b8'` (slate-400), `weight: 1`, `fillOpacity: 0`. Visible on dark basemap without competing with delivery markers.

### Visual Theme
- **D-05:** Basemap tile: CARTO dark_all — `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`. Matches Kobo Intervenciones, delivery markers pop visually on dark background.
- **D-06:** App shell: dark slate — `bg-slate-900` header background. Tailwind CSS for styling, same token set as Kobo Intervenciones.
- **D-07:** Map center: `[-34.61, -58.44]`, initial zoom: `12` (CABA — same as Kobo Intervenciones `MapaPage.tsx`).

### App Shell Structure
- **D-08:** Single page, no router. `App.tsx` renders `<Header>` + `<MapView>` directly. No `react-router-dom` dependency needed for v1. Phase 4 (deploy) adds Vercel rewrite rules but adds no new pages.
- **D-09:** Scaffold `Dashboard/` fresh with `npm create vite@latest Dashboard -- --template react-ts`. Add only required deps: `leaflet`, `react-leaflet`, `react-leaflet-cluster`, `tailwindcss`. Do NOT copy from Kobo Intervenciones to avoid dragging in `zustand`, `recharts`, `react-router-dom`.

### Header (MAP-04)
- **D-10:** Header content: total kit count + last-updated timestamp only. No title text, no logo. Minimal header height maximizes map area on 375px mobile screens.
- **D-11:** Timestamp source: `meta.json` → `timestamp` field (ISO 8601 with UTC-3 offset from Phase 2 D-07). Display formatted for readability (e.g., `01/06/2026 14:30`).

### Popup (MAP-03)
- **D-12:** Popup fields: `nombre`, `apellido`, `genero`, `edad`, `observaciones`. No `dni_hash` displayed (privacy — only needed for data integrity, not operator view). `submission_time` MAY be shown (available from Phase 2 D-04) at Claude's discretion.
- **D-13:** Null/None values (from Phase 2 D-05) display as `—` in popup for readability.

### Claude's Discretion
- Internal component file structure within `Dashboard/src/`
- Whether `submission_time` appears in popup (available per Phase 2 D-04 but not required by MAP-03)
- Exact Tailwind classes for header layout (beyond `bg-slate-900`)
- Map container height on desktop vs mobile (must satisfy MAP-06: navigable at 375px)
- Whether to add a loading/error state component or inline in `App.tsx`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Acceptance Criteria
- `.planning/REQUIREMENTS.md` — MAP-01 through MAP-06 (authoritative acceptance criteria for this phase)
- `.planning/ROADMAP.md` — Phase 3 success criteria (5 criteria including mobile 375px, no DNI in popup)

### Project Constraints
- `CLAUDE.md` — Stack rules: `leaflet >= 1.9.4`, `react-leaflet >= 4.2.1`, `vite >= 5.0`, `@vitejs/plugin-react >= 4.0`, Node.js >= 20; explicit libraries NOT to use (MapLibre, Deck.gl, CRA)
- `.planning/PROJECT.md` — Core value, constraints, deploy target (Vercel), privacy (DNI never in clear in any output)

### Prior Phase Decisions
- `.planning/phases/01-python-pipeline/01-CONTEXT.md` — D-10: Comunas.json confirmed WGS84
- `.planning/phases/02-json-exporter/02-CONTEXT.md` — D-01 through D-08: JSON field names, meta.json structure, null serialization

### Geo Assets
- `comunas/Comunas.json` — Commune boundary GeoJSON, WGS84 CRS confirmed (no reprojection needed)

### Reference Implementation
- `C:\Users\facuc\onedrive\escritorio\KOBO\Kobo Intervenciones\Dashboard\src\routes\MapaPage.tsx` — Map center, tile layer URL, `MapContainer` + `TileLayer` + `Marker` + `Popup` pattern
- `C:\Users\facuc\onedrive\escritorio\KOBO\Kobo Intervenciones\Dashboard\src\hooks\useDashboardData.ts` — `fetchJson<T>` hook pattern and `./data/dist` base path
- `C:\Users\facuc\onedrive\escritorio\KOBO\Kobo Intervenciones\Dashboard\vite.config.ts` — `base: './'` config (required for Vercel relative asset paths)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDashboardData.ts` (Kobo Intervenciones) — `fetchJson<T>` pattern, loading/error/ok state machine — adapt for `useEntregas` hook that fetches only `entregas.json` + `meta.json`
- `MapaPage.tsx` (Kobo Intervenciones) — `MapContainer` + `TileLayer` + `Marker` + `Popup` skeleton; CARTO tile URL, center coords, zoom
- `vite.config.ts` (Kobo Intervenciones) — `base: './'` and `@` alias pattern — copy exactly

### Established Patterns
- `./data/dist` base path for JSON data (set in hook, not hardcoded per component)
- `HashRouter` NOT used in this project (D-08 above — single page)
- Polars Parquet write on Windows workaround already handled in Phase 1/2 — no impact on frontend
- Atomic JSON write (Phase 2) means `entregas.json` is always complete when the SPA reads it

### Integration Points
- Input: `Dashboard/public/data/dist/entregas.json` + `Dashboard/public/data/dist/meta.json` (written by `exporter.py`, Phase 2)
- Input: `comunas/Comunas.json` — bundled as static asset or fetched at runtime from `public/`
- Output: `Dashboard/dist/` — Vite build output, deployed to Vercel in Phase 4

### Key Constraint
- `Comunas.json` needs to be accessible at runtime. Two approaches: (1) copy to `Dashboard/public/` so it's served statically, or (2) import as a JSON module in the bundle. Researcher should evaluate bundle size impact (~200KB GeoJSON).

</code_context>

<specifics>
## Specific Ideas

- Operator flow: open URL → map loads with commune boundaries + all delivery markers clustered → zoom in to see individual markers → tap marker → popup with nombre, apellido, género, edad, observaciones
- Header strip (top): total kit count (`N kits entregados`) + last-updated timestamp formatted as `DD/MM/YYYY HH:mm`
- Map fills remaining viewport height below header (flex column layout, map `flex-1`)
- At 375px width: header wraps gracefully, map remains pan/zoom-able (no horizontal overflow)
- CABA bounding box note: per Phase 1 D-05, coordinates outside CABA are kept in data — markers may appear outside commune polygons as outliers; this is expected behavior

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-react-spa*
*Context gathered: 2026-06-01*
