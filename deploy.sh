#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(realpath "$0")")"
if [ -f .venv/bin/activate ]; then source .venv/bin/activate; fi
python pipeline.py && python exporter.py && (cd Dashboard && npm run build && vercel --prod)
