# Operativo Frío — Mapa de Entregas de Kits

## What This Is

Pipeline de datos + dashboard React/TS que extrae registros de entrega de kits de invierno desde KoBoToolbox, los almacena localmente como Parquet (luego en Neon PostgreSQL), y los muestra en un mapa interactivo con los límites de comunas de CABA y los puntos exactos de cada entrega.

## Core Value

Que cualquier operador pueda ver en un mapa dónde se entregaron kits y cuántas entregas hubo por comuna, en base a datos reales del formulario Kobo.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Extraer datos del formulario KoBoToolbox vía API REST (KEY + URL en .env)
- [ ] Almacenar localmente como .parquet (primer paso antes de nube)
- [ ] Migrar datos a Neon PostgreSQL (segunda etapa)
- [ ] Hashear DNI con SHA-256 + salt antes de cualquier salida de datos
- [ ] Mapa interactivo React/TS con límites de comunas (polígonos/líneas)
- [ ] Puntos de entrega en el mapa (uno por registro del formulario)
- [ ] Popup por punto: nombre, apellido, género, edad, observaciones (sin DNI real)
- [ ] Deploy en Vercel con un comando

### Out of Scope

- Filtros en v1 — agregar en v2 cuando haya datos reales
- Panel de estadísticas / contadores — v2
- Autenticación de usuarios — uso interno, sin login en v1

## Context

- Formulario Kobo "Operativo Frío": campos coordinates, DNI, nombre, apellido, género, edad, observaciones
- Credenciales en `.env`: KEY_OP_FRIO y URL_OP_FRIO
- Archivos de comunas CABA disponibles en otros proyectos del workspace: shapefiles + JSON en `autom-bap-personas/assets/comunas/` y `KOBO/Kobo Intervenciones/assets/comunas/`
- Proyecto de referencia: **Kobo Intervenciones** — pipeline Python + SPA React/TS + Vercel con el mismo patrón de datos Kobo; reutilizar patrones de extracción, limpieza, hash DNI y deploy
- El formulario está vacío ahora; el pipeline debe funcionar cuando lleguen los datos

## Constraints

- **Privacy**: DNI nunca en claro en ningún artefacto de salida — SHA-256 + salt obligatorio
- **Stack**: Python 3.10+ para pipeline, React + TypeScript para frontend (igual que Kobo Intervenciones)
- **Storage**: Local .parquet primero, Neon PostgreSQL después (no cambiar arquitectura base)
- **Deploy**: Vercel para el frontend
- **Geo data**: Usar los shapefiles/GeoJSON de comunas ya disponibles en el workspace

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Parquet local antes de Neon | Iteración rápida sin depender de DB cloud en etapa inicial | — Pending |
| React + TS para mapa | Misma stack que Kobo Intervenciones — reutilizar patrones y conocimiento | — Pending |
| SHA-256 + salt para DNI | Dato sensible; mismo patrón que Kobo Intervenciones | — Pending |
| Comunas como GeoJSON | Formato nativo para Leaflet/MapLibre, más simple que SHP en frontend | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-29 after initialization*
