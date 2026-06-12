#!/bin/bash
# build.sh — Build local completo (Kobo -> datos -> dashboard)
# Para deploy en Vercel NO se usa este script: Vercel solo corre el frontend
# (Dashboard/vercel.json) usando los JSON ya commiteados por el GitHub Action.
set -e

echo "== 1/4: Dependencias Python =="
pip install --quiet -r requirements.txt

echo "== 2/4: Pipeline Kit Frío (Kobo -> parquet) =="
python pipeline.py

echo "== 3/4: Export a JSON (parquet -> Dashboard/public/data/dist) =="
python exporter.py
python pipelines/pipeline_casos_criticos.py || echo "(casos críticos omitido)"

echo "== 4/4: Build React (Vite) =="
cd Dashboard
npm ci
npm run build
cd ..

echo "✓ Listo. Output: Dashboard/dist/"
