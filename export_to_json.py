"""
export_to_json.py — Export Parquet data to Dashboard JSON format

Reads data/entregas.parquet (produced by pipeline.py) and exports to:
  - Dashboard/public/data/dist/entregas.json
  - Dashboard/public/data/dist/meta.json

Usage:
    python export_to_json.py
"""

import json
import sys
from pathlib import Path

import polars as pl

INPUT_PARQUET = "data/entregas.parquet"
OUTPUT_DIR = "Dashboard/public/data/dist"


def export_json() -> None:
    """Read Parquet and write JSON files for the Dashboard."""
    input_path = Path(INPUT_PARQUET)
    if not input_path.exists():
        print(f"ERROR: {INPUT_PARQUET} not found. Run pipeline.py first.", file=sys.stderr)
        sys.exit(1)

    output_path = Path(OUTPUT_DIR)
    output_path.mkdir(parents=True, exist_ok=True)

    # Read the Parquet file
    df = pl.read_parquet(input_path)
    print(f"Leyendo {len(df)} registros desde {INPUT_PARQUET}")

    # Convert to records (list of dicts) and export
    records = df.to_dicts()
    json_file = output_path / "entregas.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Exportado {len(records)} registros a {json_file}")

    # Export metadata
    meta = {
        "total_records": len(df),
        "columns": df.columns,
        "schema": {col: str(df[col].dtype) for col in df.columns},
    }
    meta_file = output_path / "meta.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"Exportado metadata a {meta_file}")


if __name__ == "__main__":
    export_json()
