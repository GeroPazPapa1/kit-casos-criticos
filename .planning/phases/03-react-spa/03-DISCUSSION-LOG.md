# Phase 3: React SPA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 3-react-spa
**Areas discussed:** Marker clustering, Commune polygons, Visual theme, App shell structure

---

## Marker Clustering

| Option | Description | Selected |
|--------|-------------|----------|
| react-leaflet-cluster | Wraps leaflet.markercluster. Most widely used with react-leaflet v4. Drop-in MarkerClusterGroup. | ✓ |
| leaflet.markercluster directly | Imperative API, no React wrapper. More control but requires useMap() hook and manual lifecycle. | |
| You decide | Claude picks simplest option. | |

**User's choice:** react-leaflet-cluster

| Option | Description | Selected |
|--------|-------------|----------|
| Default leaflet.markercluster style | Green/yellow/red circles with count. Zero custom CSS. | ✓ |
| Custom styled circles | Match app color scheme. Requires custom icon function and CSS overrides. | |

**User's choice:** Default leaflet.markercluster style
**Notes:** No custom styling — use library defaults out of the box.

---

## Commune Polygons

| Option | Description | Selected |
|--------|-------------|----------|
| Static styled borders only | Polygons show commune boundaries as colored outlines. No hover state. Simpler code. | ✓ |
| Hover highlight + commune name tooltip | Hovering highlights polygon and shows commune name tooltip. ~20 extra lines. | |

**User's choice:** Static styled borders only

| Option | Description | Selected |
|--------|-------------|----------|
| Thin semi-transparent light border | stroke: #94a3b8 (slate-400), weight: 1, fillOpacity: 0. Visible on dark and light basemaps. | ✓ |
| Bold colored border | stroke: #3b82f6 (blue-500), weight: 2. More prominent. | |
| You decide | Claude picks style that reads well on chosen basemap. | |

**User's choice:** Thin semi-transparent light border
**Notes:** slate-400 border on dark basemap, no fill.

---

## Visual Theme

| Option | Description | Selected |
|--------|-------------|----------|
| CARTO dark_all — match Kobo Intervenciones | Dark basemap, same as sibling project. Delivery points pop visually. | ✓ |
| CARTO Positron (light/neutral) | Light minimalist basemap. Better readability outdoors in daylight. | |

**User's choice:** CARTO dark_all

| Option | Description | Selected |
|--------|-------------|----------|
| Dark slate (bg-slate-900 header) | Consistent with Kobo Intervenciones. Header blends with dark basemap. | ✓ |
| You decide | Claude picks dark-compatible scheme. | |

**User's choice:** Dark slate bg-slate-900

---

## App Shell Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single page, no router | App.tsx renders Header + Map directly. Phase 4 is deploy-only. Simpler. | ✓ |
| HashRouter with one route (Kobo Intervenciones pattern) | Future-proof. Adds react-router-dom. | |

**User's choice:** Single page, no router

| Option | Description | Selected |
|--------|-------------|----------|
| Kit count + timestamp only | Minimal. Exactly MAP-04. Less header height = more map on small screens. | ✓ |
| Title + kit count + timestamp | Add 'Operativo Frío' title. Useful for screenshots. | |
| You decide | Claude picks minimal header satisfying MAP-04. | |

**User's choice:** Kit count + timestamp only

| Option | Description | Selected |
|--------|-------------|----------|
| Scaffold fresh with npm create vite | Clean scaffold, add only required deps. | ✓ |
| Copy Dashboard/ from Kobo Intervenciones and strip down | Faster but risks keeping unused deps (zustand, recharts). | |

**User's choice:** Scaffold fresh with npm create vite

---

## Claude's Discretion

- Internal component file structure within `Dashboard/src/`
- Whether `submission_time` appears in popup
- Exact Tailwind classes for header layout beyond `bg-slate-900`
- Map container height strategy for desktop vs mobile
- Loading/error state placement (inline or separate component)

## Deferred Ideas

None — discussion stayed within phase scope.
