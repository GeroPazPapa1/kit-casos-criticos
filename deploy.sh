#!/usr/bin/env bash
set -euo pipefail
python pipeline.py && python exporter.py
