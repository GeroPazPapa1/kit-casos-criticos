# Arquitectura — Operativo Frío

## Visión general

El sistema tiene tres capas independientes: un pipeline Python de extracción/transformación, un exportador que produce artefactos estáticos, y un SPA React que los consume. No hay backend en tiempo de ejecución — todo lo que Vercel sirve son archivos estáticos generados localmente.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PIPELINE (local)                         │
│                                                                 │
│  KoBoToolbox API v2                                             │
│       │                                                         │
│       │  HTTPS + Token                                          │
│       ▼                                                         │
│  pipeline.py                                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  fetch_all_submissions()   → paginación automática     │     │
│  │  transform_record()        → parsea _geolocation       │     │
│  │  hash_dni()                → SHA-256 + salt/registro   │     │
│  │  write_parquet()           → Polars DataFrame tipado   │     │
│  │  run_linter()              → aborta si DNI sin hash    │     │
│  └──────────────────────────┬─────────────────────────────┘     │
│                             │                                   │
│                             ▼                                   │
│                   data/entregas.parquet  (gitignored)           │
│                             │                                   │
│  exporter.py                │                                   │
│  ┌──────────────────────────▼─────────────────────────────┐     │
│  │  run_linter()      → segunda verificación DNI          │     │
│  │  prepare_records() → filtra nulos lat/lon              │     │
│  │  write_atomic()    → dist.new/ → rename → dist/        │     │
│  └──────────────────────────┬─────────────────────────────┘     │
│                             │                                   │
│              ┌──────────────┴──────────────┐                   │
│              ▼                             ▼                   │
│   Dashboard/public/data/dist/       Dashboard/public/data/dist/│
│     entregas.json                     meta.json                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    npm run build  (Vite)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (producción)                        │
│                                                                 │
│   Dashboard/dist/          ← archivos estáticos compilados      │
│   Dashboard/vercel.json    ← catch-all rewrite → /index.html   │
│                                                                 │
│   https://op-frio.vercel.app                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Browser del operador
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SPA React/TypeScript                      │
│                                                                 │
│   App.tsx                                                       │
│   ├── useEntregas()   → fetch entregas.json + meta.json        │
│   ├── Header          → total kits + timestamp                 │
│   └── MapView                                                   │
│       ├── TileLayer   → CARTO dark basemap                     │
│       ├── GeoJSON     → Comunas.json (15 comunas CABA)         │
│       └── MarkerClusterGroup → un Marker + Popup por entrega   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo de datos detallado

```
KoBoToolbox                  Local                          Vercel CDN
─────────────────────────────────────────────────────────────────────
Formulario Kobo
  └─ Submission              
       [_id, _geolocation,   pipeline.py
        nombre, apellido,  ──────────────►  entregas.parquet
        genero, edad,                          [id, lat, lon,
        observaciones, dni]                     nombre, apellido,
                                                genero, edad,
                                                observaciones,
                                                dni_hash,         (DNI nunca en claro)
                                                submission_time]

                             exporter.py
                           ──────────────►  entregas.json         ──────────────► Browser
                                            meta.json             ──────────────► Browser
                           
                             npm run build
                           ──────────────►  dist/                 ──────────────► Browser
                                            (index.html,
                                             assets/,
                                             comunas/,
                                             data/dist/)
```

---

## Componentes

### pipeline.py

| Función | Responsabilidad |
|---------|----------------|
| `fetch_all_submissions()` | Llama a la API v2 de KoBoToolbox siguiendo `data["next"]` hasta agotar páginas |
| `transform_record()` | Parsea `_geolocation[0/1]` como lat/lon, construye el dict limpio sin clave `dni` |
| `hash_dni()` | SHA-256 + `os.urandom(16)` por registro — el único lugar donde toca el DNI crudo |
| `write_parquet()` | DataFrame Polars con schema explícito, maneja el caso de cero registros |
| `run_linter()` | Lee el Parquet de salida y aborta con `sys.exit(1)` si detecta columna `dni` |

**Invariante de privacidad:** `transform_record()` nunca incluye la clave `"dni"` en el dict de retorno. El valor crudo entra a `hash_dni()` y nunca sale.

### exporter.py

| Función | Responsabilidad |
|---------|----------------|
| `run_linter()` | Segunda verificación: substring match en nombres de columnas (`dni`, `documento`, `document`) — `dni_hash` está explícitamente exento |
| `prepare_records()` | Filtra registros con lat/lon nulos, renombra `kobo_id → id` |
| `write_atomic()` | Escribe en `dist.new/`, mueve `dist/ → dist.old/`, renombra `dist.new/ → dist/`, borra `dist.old/` — readers nunca ven estado parcial |

### Dashboard (React/TypeScript)

```
src/
├── types/
│   ├── domain.ts       # Entrega — id, lat, lon, nombre, apellido, genero, edad, observaciones
│   └── meta.ts         # Meta — timestamp, total
├── hooks/
│   └── useEntregas.ts  # Discriminated union: loading | error | ok(entregas, meta)
└── components/
    ├── Header.tsx       # Muestra meta.total y meta.timestamp formateado
    └── MapView.tsx      # MapContainer + GeoJSON comunas + MarkerClusterGroup + Popups
```

**Decisiones clave del frontend:**

| Decisión | Razón |
|----------|-------|
| HashRouter (sin BrowserRouter) | Necesario con `base: './'` en Vite — evita rutas absolutas que rompen en Vercel sin server-side routing |
| `vercel.json` catch-all | HashRouter maneja rutas en cliente, pero la navegación directa a `/cualquier-ruta` pide ese path al CDN — el rewrite devuelve `index.html` y el router toma el control |
| GeoJSON en `public/comunas/` | ~200KB — demasiado grande para bundlear; se sirve por separado y se fetcha en runtime |
| Communas nunca con `interactive: true` | Solo son bordes de referencia visual, no deben responder a clicks |
| `MarkerClusterGroup` | Sin clusters, con >500 puntos el mapa se degrada notablemente en mobile |
| `App.tsx` filtra coords inválidas | Leaflet falla silenciosamente con `lat > 90` o `NaN` — el filtro es un guard de seguridad ante datos sucios de Kobo |

---

## Decisiones de stack

| Capa | Herramienta | Alternativa descartada | Razón |
|------|-------------|------------------------|-------|
| Extracción API | `requests` directo | `koboextractor` | 8 commits, sin mantenimiento activo |
| Almacenamiento | Polars + Parquet | pandas + CSV | Schema estricto, sin footgun mutable, 0-row safe |
| Frontend | React + TypeScript | Vue, Svelte | Misma stack que Kobo Intervenciones |
| Mapa | react-leaflet | MapLibre GL JS | 7× más liviano, API declarativa, sin tile server propio |
| Build | Vite 5 | Create React App | CRA deprecado; Vite: startup instantáneo, auto-detección en Vercel |
| Deploy | Vercel | Netlify, Railway | Detección automática de Vite, CDN global, plan gratuito suficiente |
| Privacidad DNI | SHA-256 + salt/registro | Salt global | Salt global es bruteforceable con ~40M DNIs argentinos |

---

## Diseño de privacidad

```
KoBoToolbox submission
         │
         │   dni = "12345678"  ← crudo, llega del formulario
         │
         ▼
   hash_dni(raw_value)
         │
         │  salt = os.urandom(16)           ← 16 bytes aleatorios por registro
         │  digest = SHA-256(salt + dni)
         │
         ▼
   "a3f2...1c:9d4b...8e"  ← salt_hex:digest_hex, 97 chars
         │
         ▼
   entregas.parquet  →  entregas.json  →  (nunca en popups)
```

El campo `dni_hash` se almacena y transmite pero **nunca se renderiza en ningún componente React**. El popup (`MapView.tsx`) usa exclusivamente: `nombre`, `apellido`, `genero`, `edad`, `observaciones`.

---

## Cómo agregar un campo nuevo del formulario

1. **pipeline.py** — agregar la clave en `transform_record()` y en `SCHEMA`
2. **exporter.py** — si el campo tiene substrings sensibles, agregar a `FORBIDDEN_SUBSTRINGS` o a `ALLOWED_COLS`
3. **Dashboard/src/types/domain.ts** — agregar la propiedad al tipo `Entrega`
4. **MapView.tsx** — agregar al JSX del `<Popup>` si se quiere mostrar

---

## v2 — Expansión

La arquitectura actual es deliberadamente estática (sin backend en runtime). La migración a v2 agrega Neon PostgreSQL y serverless functions manteniendo la misma estructura frontend:

```
v1 (actual)                         v2
────────────────────────────────────────────────────────
pipeline.py → entregas.parquet      pipeline.py → Neon PostgreSQL
exporter.py → entregas.json         (exporter.py deprecado)
Vercel sirve JSON estático          Vercel serverless function
useEntregas fetch JSON              useEntregas fetch /api/entregas
                                    API aplica filtros server-side
```

**Cambios mínimos necesarios para v2:**

| Archivo | Cambio |
|---------|--------|
| `pipeline.py` | Agregar función `write_postgres()` con psycopg3 + SQLAlchemy 2.0.33+ |
| `Dashboard/api/entregas.ts` | Nueva serverless function con filtros por fecha, género, edad, comuna |
| `useEntregas.ts` | Cambiar URL de fetch de `/data/dist/entregas.json` a `/api/entregas` |
| `Dashboard/vercel.json` | Agregar `"functions"` config si se necesita timeout extendido |
| `.env` | Agregar `DATABASE_URL` para Neon |

El contrato de tipos (`Entrega`, `Meta`) no cambia — la API devuelve el mismo shape de JSON.

---

## Decisiones de seguridad

| Amenaza | Componente | Mitigación |
|---------|-----------|------------|
| DNI en claro en artefactos de salida | pipeline.py, exporter.py | Linter doble: aborta en Parquet y antes de escribir JSON |
| Token de Vercel en repositorio | deploy.sh | Token en `~/.local/share/com.vercel.cli/auth.json` — nunca hardcodeado |
| XSS en popups de marcadores | MapView.tsx | React auto-escapa strings — sin dangerouslySetInnerHTML |
| Rewrite catch-all expone rutas arbitrarias | vercel.json | Catch-all sirve solo `index.html`; Vercel sirve assets estáticos directamente antes del rewrite |
| `.vercel/project.json` expone IDs del proyecto | Dashboard/.gitignore | `projectId`/`orgId` son identificadores no secretos — el patrón oficial de Vercel para equipos |
