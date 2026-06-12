# Deployment Guide — Operativo Frío

## Cómo funciona (arquitectura)

```
GitHub Action (cada 5 min, .github/workflows/kit-frio-update.yml)
   │  pipeline.py            Kobo -> data/entregas.parquet  (parquet NO se commitea)
   │  exporter.py            parquet -> Dashboard/public/data/dist/{entregas,meta}.json
   │  pipeline_casos_criticos.py  Kobo -> Dashboard/public/data/dist/casos_criticos*.json
   │  git commit + push      (solo Dashboard/public/data/dist)
   ▼
push a main
   ▼
Vercel (conectado al repo de GitHub) redeploya automáticamente
   │  Root Directory = Dashboard   (Dashboard/vercel.json)
   │  npm install && npm run build  -> Dashboard/dist  (~1.6 MB)
   ▼
https://<tu-proyecto>.vercel.app
   • El frontend hace fetch de ./data/dist/*.json (datos ya commiteados)
```

Clave: **Vercel NO corre el pipeline ni baja datos de Kobo**. Solo compila el
frontend con los JSON que el Action ya dejó commiteados. Por eso Vercel no
necesita los secrets de Kobo y el deploy es chico (no se sube `node_modules`).

## Configuración inicial (una vez)

### 1. Secrets en GitHub (Settings -> Secrets and variables -> Actions)
- `KEY_OP_FRIO` — token de KoBoToolbox
- `URL_OP_FRIO` — URL del formulario Kit Frío (`.../api/v2/assets/<UID>/data/`)
- `URL_CASOS_CRITICOS` — URL del formulario Casos Críticos

> Ya NO hacen falta `VERCEL_TOKEN`, `VERCEL_ORG_ID` ni `VERCEL_PROJECT_ID`:
> el redeploy lo dispara el push porque Vercel está conectado al repo.

### 2. Proyecto en Vercel
- Conectar el repo de GitHub al proyecto (Git Integration).
- **Root Directory: `Dashboard`** (Settings -> General -> Root Directory).
- Production Branch: `main`.
- No hace falta cargar variables de entorno de Kobo en Vercel.

## Correr local

```bash
bash build.sh    # instala deps, baja datos, exporta JSON y compila el dashboard
# o pasos sueltos:
python pipeline.py            # data/entregas.parquet
python exporter.py            # Dashboard/public/data/dist/{entregas,meta}.json
python pipelines/pipeline_casos_criticos.py
cd Dashboard && npm run build # Dashboard/dist
```

Credenciales locales: crear `.env` en la raíz con `KEY_OP_FRIO`, `URL_OP_FRIO`
y `URL_CASOS_CRITICOS`.

## Troubleshooting

**Deploy supera 100 MB** → causa típica: deploy por CLI subiendo `node_modules`
(179 MB). Con Vercel conectado a Git esto no pasa (clona el repo, instala deps
en el server, y `node_modules`/`data/` están en `.gitignore`).

**El frontend no muestra datos nuevos** → revisar que el Action haya hecho push
(pestaña Actions) y que Vercel haya redeployado. El front lee
`./data/dist/*.json`, que deben estar commiteados.

**El dashboard se rompe tras un deploy** → asegurarse de usar `exporter.py`
(formato `id` + `{timestamp,total}`), NO un exporter con `kobo_id`.
