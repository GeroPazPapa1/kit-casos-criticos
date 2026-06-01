import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import polars as pl

PARQUET_INPUT = "data/entregas.parquet"
DIST_DIR = Path("Dashboard/public/data/dist")
DIST_NEW_DIR = Path("Dashboard/public/data/dist.new")
TZ_BSAS = ZoneInfo("America/Argentina/Buenos_Aires")
FORBIDDEN_COLS = {"dni", "documento", "document"}


def run_linter(df: pl.DataFrame) -> None:
    forbidden = [c for c in df.columns if c.lower() in FORBIDDEN_COLS]
    if forbidden:
        print(f"LINTER FAIL: columna(s) prohibida(s) {forbidden}", flush=True)
        sys.exit(1)
    print(f"Linter OK: {len(df)} registros, sin columna DNI cruda.")


def prepare_records(df: pl.DataFrame) -> list[dict]:
    df = df.rename({"kobo_id": "id"})
    return df.to_dicts()


def write_atomic(records: list[dict], timestamp_str: str) -> None:
    DIST_NEW_DIR.parent.mkdir(parents=True, exist_ok=True)
    if DIST_NEW_DIR.exists():
        shutil.rmtree(DIST_NEW_DIR)
    DIST_NEW_DIR.mkdir()
    with open(DIST_NEW_DIR / "entregas.json", "w", encoding="utf-8") as f:
        f.write(json.dumps(records, ensure_ascii=False, indent=2))
    with open(DIST_NEW_DIR / "meta.json", "w", encoding="utf-8") as f:
        f.write(json.dumps({"timestamp": timestamp_str, "total": len(records)}, ensure_ascii=False, indent=2))
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_NEW_DIR.rename(DIST_DIR)


def main() -> None:
    df = pl.read_parquet(PARQUET_INPUT)
    run_linter(df)
    records = prepare_records(df)
    timestamp_str = datetime.now(TZ_BSAS).isoformat(timespec="seconds")
    write_atomic(records, timestamp_str)
    print(f"Wrote {len(records)} records to {DIST_DIR / 'entregas.json'}")


if __name__ == "__main__":
    main()
