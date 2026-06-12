# Deployment Guide — Operativo Frío

## 🚀 Cómo correr el circuito completo

### Setup inicial (una sola vez)

```bash
# 1. Clonar y entrar
git clone https://github.com/facundocornetgcba/OP-frio.git
cd OP-frio

# 2. Instalar dependencias (Python + Node)
bash setup-local.sh

# 3. Editar .env con tus credenciales KoBoToolbox
cat > .env << 'EOF'
KEY_OP_FRIO=<tu_token>
URL_OP_FRIO=https://kf.kobotoolbox.org/api/v2/assets/<UID>/data/
EOF
```

---

## 📋 Ejecutar el pipeline (desarrollo local)

### Opción A: Build completo (recomendado)

```bash
bash build.sh
```

**Qué hace:**

1. ✓ Instala dependencias Python
2. ✓ Corre `pipeline.py` → descarga de Kobo → `data/entregas.parquet`
3. ✓ Corre `export_to_json.py` → Parquet → JSON en `Dashboard/public/data/dist/`
4. ✓ Compila React con Vite → `Dashboard/dist/`

**Output:** Dashboard compilado en `Dashboard/dist/` listo para servir.

---

### Opción B: Pasos individuales (debugging)

```bash
# Activar entorno virtual
source .venv/Scripts/activate  # Windows Git Bash
# o
source .venv/bin/activate      # Linux/macOS

# Paso 1: Pipeline
python pipeline.py
# Output: data/entregas.parquet

# Paso 2: Exportar a JSON
python export_to_json.py
# Output: Dashboard/public/data/dist/{entregas.json, meta.json}

# Paso 3: Compilar React
cd Dashboard
npm run build
# Output: Dashboard/dist/
```

---

## 🌐 Deploy a Vercel

### Desde local (después de build.sh)

```bash
cd Dashboard
vercel --prod --token $VERCEL_TOKEN
```

### Automático (GitHub Actions)

El workflow `.github/workflows/kit-frio-update.yml`:

- Corre cada 2 minutos
- Descarga datos nuevos de Kobo
- Si hay cambios: hace push + auto-deploy a Vercel

**Requisitos:** Set these secrets in GitHub:

- `KEY_OP_FRIO` — Token KoBoToolbox
- `URL_OP_FRIO` — URL endpoint del formulario
- `VERCEL_TOKEN` — Token Vercel (https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — Tu org ID
- `VERCEL_PROJECT_ID` — Tu proyecto ID

---

## 🏗️ Flujo completo de datos

```
KoBoToolbox API
      ↓
pipeline.py
  • Extrae todos los registros (paginación automática)
  • Parsea GPS ([lat, lon])
  • Hashea DNI: SHA-256 + salt aleatorio
  • Genera schema tipado con Polars
  • Linter: verifica sin DNI crudo
      ↓
data/entregas.parquet
      ↓
export_to_json.py
  • Lee Parquet
  • Convierte a lista de dicts
  • Escribe JSON con metadata
  • Copia a Dashboard/public/data/dist/
      ↓
Dashboard/public/data/dist/
  ├── entregas.json (datos)
  └── meta.json (metadata)
      ↓
npm run build (Vite)
  • Compila React + TypeScript
  • Transpila para navegadores modernos
  • Minifica y tree-shakes código
  • Output: Dashboard/dist/
      ↓
vercel --prod
  • Publica Dashboard/dist/ → Vercel CDN
  • Asigna URL: https://op-frio.vercel.app
      ↓
https://op-frio.vercel.app
  • Carga index.html
  • useEntregas hook: fetch('./data/dist/entregas.json')
  • Renderiza mapa con Leaflet + puntos
```

---

## 📊 Vercel Build Configuration

`Dashboard/vercel.json`:

```json
{
  "buildCommand": "cd .. && bash build.sh",
  "outputDirectory": "Dashboard/dist"
}
```

**En Vercel (cada deploy):**

1. Clona repo (sin `data/` ni `Dashboard/public/data/dist/`)
2. Ejecuta `cd .. && bash build.sh` en la raíz
3. El script corre pipeline + export + npm build
4. Vercel publica `Dashboard/dist/`
5. Resultado: ~5-10 MB (solo código compilado, sin datos crudos)

---

## 🔍 Troubleshooting

### ❌ "File size limit exceeded (100 MB)"

→ `.gitignore` no estaba excluyendo `Dashboard/public/data/dist/`
→ **Solución:** Ya corregido. Ahora esos datos se generan en build time.

### ❌ "Export failed: data/entregas.parquet not found"

→ Falta correr `pipeline.py` primero
→ **Solución:** Usa `bash build.sh` que ejecuta todo en orden.

### ❌ "npm: command not found"

→ Node.js no instalado o PATH incorrecto
→ **Solución:** `node --version` debe ser v20+. Reinstala desde nodejs.org

### ❌ "KEY_OP_FRIO or URL_OP_FRIO not set"

→ Falta el archivo `.env`
→ **Solución:** Crea `.env` en la raíz con tus credenciales KoBoToolbox

---

## 📝 Logs en Vercel

Accede a: https://vercel.com/projects/op-frio/deployments

Cada deploy muestra:

- Output de `pip install`
- Output de `python pipeline.py`
- Output de `python export_to_json.py`
- Output de `npm run build`
- Tamaño final del deploy

---

## ✅ Checklist previo a producción

- [ ] `.env` configurado con credenciales reales
- [ ] GitHub secrets configurados (KEY, URL, VERCEL_TOKEN, ORG_ID, PROJECT_ID)
- [ ] `bash build.sh` corre sin errores en local
- [ ] `Dashboard/dist/` generado correctamente
- [ ] `vercel --prod` publica sin errores
- [ ] Mapa carga y muestra entregas en https://op-frio.vercel.app
- [ ] GitHub Action corre y auto-deploya cada 2 minutos (opcional)

---

## 🎯 Próximas etapas

- [ ] Migración a Neon PostgreSQL (reemplaza Parquet)
- [ ] API serverless en Vercel Edge Functions
- [ ] Filtros por fecha, género, edad, comuna
- [ ] Choropleth de densidad por comuna
- [ ] Webhook KoBoToolbox para updates en tiempo real
