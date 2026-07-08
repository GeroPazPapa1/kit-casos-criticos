import json
import os
import shutil
import stat
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import polars as pl

PARQUET_INPUT = "data/entregas.parquet"
DIST_DIR = Path("Dashboard/public/data/dist")
DIST_NEW_DIR = Path("Dashboard/public/data/dist.new")
TZ_BSAS = ZoneInfo("America/Argentina/Buenos_Aires")

FORBIDDEN_SUBSTRINGS = {"documento", "document"}
ALLOWED_COLS = {"dni", "dni_unificado", "dni_hash"}


def _rmtree_force(path: Path) -> None:
    def _handler(func, fpath, exc):
        os.chmod(fpath, stat.S_IWRITE)
        func(fpath)

    if sys.version_info >= (3, 12):
        shutil.rmtree(str(path), onexc=_handler)
    else:
        def _onerror(func, fpath, exc_info):
            os.chmod(fpath, stat.S_IWRITE)
            func(fpath)

        shutil.rmtree(str(path), onerror=_onerror)


def run_linter(df: pl.DataFrame) -> None:
    forbidden = [
        c for c in df.columns
        if c not in ALLOWED_COLS and any(f in c.lower() for f in FORBIDDEN_SUBSTRINGS)
    ]

    if forbidden:
        print(f"LINTER FAIL: columna(s) prohibida(s) {forbidden}", flush=True)
        sys.exit(1)

    print(f"Linter OK: {len(df)} registros.", flush=True)


def prepare_records(df: pl.DataFrame) -> list[dict]:
    if "kobo_id" not in df.columns:
        print("ERROR: Parquet schema mismatch — columna 'kobo_id' no encontrada.", flush=True)
        sys.exit(1)

    null_count = df.filter(pl.col("lat").is_null() | pl.col("lon").is_null()).height

    if null_count > 0:
        print(f"Warning: {null_count} registros omitidos — coordenadas lat/lon nulas.", flush=True)

    df = df.filter(pl.col("lat").is_not_null() & pl.col("lon").is_not_null())
    df = df.rename({"kobo_id": "id"})

    return df.to_dicts()


def write_atomic(records: list[dict], timestamp_str: str) -> None:
    DIST_NEW_DIR.parent.mkdir(parents=True, exist_ok=True)

    if DIST_NEW_DIR.exists():
        _rmtree_force(DIST_NEW_DIR)

    DIST_NEW_DIR.mkdir()

    with open(DIST_NEW_DIR / "entregas.json", "w", encoding="utf-8") as f:
        f.write(json.dumps(records, ensure_ascii=False, indent=2))

    with open(DIST_NEW_DIR / "meta.json", "w", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {"timestamp": timestamp_str, "total": len(records)},
                ensure_ascii=False,
                indent=2,
            )
        )

    dist_old = DIST_DIR.parent / "dist.old"

    if dist_old.exists():
        _rmtree_force(dist_old)

    if DIST_DIR.exists():
        DIST_DIR.rename(dist_old)

    DIST_NEW_DIR.rename(DIST_DIR)

    # Preserve files owned by other pipelines, for example casos_criticos.json
    _OWNED = {"entregas.json", "meta.json"}

    if dist_old.exists():
        for extra in dist_old.iterdir():
            if extra.name not in _OWNED:
                shutil.copy2(extra, DIST_DIR / extra.name)

        _rmtree_force(dist_old)


def main() -> None:
    df = pl.read_parquet(PARQUET_INPUT)

    run_linter(df)

    records = prepare_records(df)

    timestamp_str = datetime.now(TZ_BSAS).isoformat(timespec="seconds")

    write_atomic(records, timestamp_str)

    print(f"Wrote {len(records)} records to {DIST_DIR / 'entregas.json'}")


if __name__ == "__main__":
    main()