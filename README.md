# Operativo Frío — Mapa de Entregas de Kits

Dashboard interactivo para visualizar las entregas de kits de abrigo del Operativo Frío del GCBA. Extrae datos desde KoBoToolbox, hashea datos sensibles, y publica un mapa en Vercel con un solo comando.

**Demo:** https://op-frio.vercel.app

---

## Qué hace

```
KoBoToolbox → pipeline.py → entregas.parquet → exporter.py → entregas.json → Mapa Leaflet
```

- Extrae todos los registros del formulario Kobo (paginación automática)
- Hashea el DNI con SHA-256 + salt por registro — nunca se almacena en claro
- Genera JSON estático servido desde Vercel
- Muestra un mapa oscuro con los 15 límites de comunas de CABA y un punto por entrega
- Popup por marcador: nombre, apellido, género, edad, observaciones

---

## Requisitos

- Python 3.10+
- Node.js 20+ y npm
- [Vercel CLI](https://vercel.com/docs/cli): `npm install -g vercel`
- Cuenta en Vercel (gratuita suficiente)

---

## Setup inicial (una sola vez)

**1. Clonar el repo y crear el entorno virtual:**

```bash
git clone https://github.com/facundocornetgcba/OP-frio.git
cd OP-frio
python -m venv .venv
```

**2. Instalar dependencias Python:**

```bash
# Linux/macOS
source .venv/bin/activate

# Windows (Git Bash)
source .venv/Scripts/activate

pip install -r requirements.txt
```

**3. Crear el archivo `.env` en la raíz del proyecto:**

```env
KEY_OP_FRIO=<token_de_la_api_kobo>
URL_OP_FRIO=https://kf.kobotoolbox.org/api/v2/assets/<UID_DEL_FORMULARIO>/data/
```

> El token se obtiene en KoBoToolbox → Cuenta → API Key.
> El UID del formulario aparece en la URL al abrir el formulario en el dashboard de Kobo.

**4. Instalar dependencias del dashboard:**

```bash
cd Dashboard && npm install && cd ..
```

**5. Vincular con Vercel (solo la primera vez):**

```bash
cd Dashboard && vercel link && cd ..
```

Responder:
- ¿Link al proyecto existente? → **No**
- Nombre → `op-frio` (minúsculas)
- Directorio → `./`

Commitear el archivo de vínculo generado:

```bash
git add Dashboard/.vercel/project.json
git commit -m "chore: link vercel project"
```

---

## Uso diario

```bash
bash deploy.sh
```

Ejecuta en secuencia:
1. `python pipeline.py` — descarga datos de Kobo, escribe `data/entregas.parquet`
2. `python exporter.py` — convierte Parquet a JSON estático en `Dashboard/public/data/dist/`
3. `npm run build` — compila el dashboard React/TS
4. `vercel --prod` — publica en https://op-frio.vercel.app

Al final imprime la URL de producción.

---

## Estructura del proyecto

```
OP-frio/
├── pipeline.py              # ETL: KoBoToolbox → data/entregas.parquet
├── exporter.py              # Convierte Parquet → JSON estático
├── deploy.sh                # Un comando hace todo
├── requirements.txt         # Dependencias Python
├── .env                     # Credenciales (no versionar)
├── data/                    # Parquet local (gitignored)
│
└── Dashboard/               # SPA React/TypeScript
    ├── public/
    │   ├── comunas/         # Comunas.json — polígonos CABA WGS84
    │   └── data/dist/       # entregas.json + meta.json (generados)
    ├── src/
    │   ├── components/      # Header, MapView
    │   ├── hooks/           # useEntregas
    │   └── types/           # domain.ts, meta.ts
    ├── vercel.json          # Catch-all rewrite → /index.html
    └── vite.config.ts       # base: './', output: dist/
```

---

## Privacidad

El DNI nunca se almacena ni transmite en claro:

- En `pipeline.py`: el valor crudo se hashea con SHA-256 + salt aleatorio de 16 bytes (`os.urandom(16)`) dentro de `hash_dni()` antes de cualquier asignación o escritura
- Un linter embebido aborta el pipeline si detecta una columna `dni` sin hashear en el Parquet
- El exportador aplica el mismo linter antes de escribir el JSON
- El popup del mapa muestra nombre, apellido, género, edad, observaciones — nunca el hash

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `KEY_OP_FRIO` | Token de API de KoBoToolbox |
| `URL_OP_FRIO` | URL completa del endpoint de datos v2 del formulario |

---

## v2 — Próximas funcionalidades

Ver [ARCHITECTURE.md](ARCHITECTURE.md#v2--expansión) para el roadmap técnico.

- Filtros por fecha, género, edad, comuna
- Choropleth de densidad por comuna
- Migración a Neon PostgreSQL (reemplaza JSON estático)
- API serverless en Vercel
