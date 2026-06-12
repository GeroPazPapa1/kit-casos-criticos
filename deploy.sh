#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(realpath "$0")")"
if [ -f .venv/bin/activate ]; then source .venv/bin/activate; fi
# Genera datos + build local. El deploy a producción lo dispara el push a main
# (Vercel está conectado al repo de GitHub y redeploya solo).
python pipeline.py && python exporter.py && python pipelines/pipeline_casos_criticos.py
(cd Dashboard && npm run build)
echo "Build local OK. Hacé commit + push de Dashboard/public/data/dist para que Vercel redeploye."
