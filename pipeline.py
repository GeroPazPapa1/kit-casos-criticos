"""
pipeline.py — Operativo Frío ETL script

Extracts all KoBoToolbox submissions for the Operativo Frío form,
transforms and sanitizes records (GPS parse, DNI hash), writes a typed
Parquet file at data/entregas.parquet, and verifies the output with an
embedded linter.

Usage:
    python pipeline.py

Reads credentials from .env:
    KEY_OP_FRIO — KoBoToolbox API token
    URL_OP_FRIO — Full v2 asset data URL, e.g.
                  https://kf.kobotoolbox.org/api/v2/assets/{uid}/data/
"""

import hashlib
import os
import sys
from pathlib import Path

import polars as pl
import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PARQUET_OUTPUT = "data/entregas.parquet"
DNI_SENTINEL = "No brinda/no visible"

SCHEMA = {
    "kobo_id":         pl.Int64,
    "lat":             pl.Float64,
    "lon":             pl.Float64,
    "nombre":          pl.Utf8,
    "apellido":        pl.Utf8,
    "genero":          pl.Utf8,
    "edad":            pl.Int64,
    "observaciones":   pl.Utf8,
    "dni_hash":        pl.Utf8,
    "submission_time": pl.Utf8,
}


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def fetch_all_submissions(api_url: str, token: str) -> list[dict]:
    """Fetches all submissions from KoBoToolbox v2 API, following pagination.

    Follows data["next"] until None.  Returns accumulated list of raw
    submission dicts.  An empty form (count=0) returns [].
    """
    headers = {"Authorization": f"Token {token}"}
    url: str | None = api_url
    records: list[dict] = []
    page = 0
    expected_count: int | None = None

    while url:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if expected_count is None:
            expected_count = data.get("count", 0)

        batch: list[dict] = data["results"]
        records.extend(batch)
        url = data["next"]  # Python None when no more pages
        page += 1
        print(
            f"  Pagina {page}: {len(batch)} registros (total: {len(records)})"
        )

    print(
        f"Extraccion completa: {len(records)} registros "
        f"(formulario reporta {expected_count})"
    )
    return records


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_int(val) -> int | None:
    """Coerce val to int; return None on failure.

    Handles numeric strings like "35.0" and plain integers.
    """
    if val is None:
        return None
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Transformation
# ---------------------------------------------------------------------------

def hash_dni(raw_value) -> str:
    """Hash DNI with SHA-256 + random per-record salt.

    Returns DNI_SENTINEL if the value is missing or empty.
    Never returns or logs the raw DNI value.
    Storage format: "{salt_hex}:{sha256_hex}"  (32 + 1 + 64 = 97 chars)
    """
    if raw_value is None:
        return DNI_SENTINEL
    v = str(raw_value).strip()
    if not v or v.lower() in ("nan", "none", ""):
        return DNI_SENTINEL
    # Per-record salt: 16 cryptographically random bytes → 32-char hex
    salt = os.urandom(16)
    digest = hashlib.sha256(salt + v.encode("utf-8")).hexdigest()
    return f"{salt.hex()}:{digest}"


def transform_record(record: dict) -> dict | None:
    """Transform a raw KoBoToolbox submission dict into a clean output dict.

    Returns None if _geolocation is missing (record is skipped, not aborted).
    The returned dict never contains a "dni" key — raw DNI is consumed inside
    hash_dni() and never assigned to any variable outside that call.

    GPS decision D-01: _geolocation is a [lat, lon] array, parsed with
    index [0] / [1].  Never uses .split().
    """
    geo = record.get("_geolocation")
    if not geo:
        print(
            f"  AVISO: omitiendo registro _id={record.get('_id')} "
            f"— sin _geolocation"
        )
        return None

    return {
        "kobo_id":         int(record["_id"]),
        "lat":             float(geo[0]),   # D-01: geo[0] = lat
        "lon":             float(geo[1]),   # D-01: geo[1] = lon
        "nombre":          str(record.get("nombre") or "").strip() or None,
        "apellido":        str(record.get("apellido") or "").strip() or None,
        "genero":          str(record.get("genero") or "").strip() or None,
        "edad":            _safe_int(record.get("edad")),
        "observaciones":   str(record.get("observaciones") or "").strip() or None,
        "dni_hash":        hash_dni(record.get("dni")),  # raw DNI consumed here only
        "submission_time": str(record.get("_submission_time") or "").strip() or None,
        # NOTE: "dni" key is deliberately NOT included — raw DNI never stored
    }


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def write_parquet(records: list[dict]) -> pl.DataFrame:
    """Build a typed Polars DataFrame and write it to PARQUET_OUTPUT.

    Handles the zero-row case by using an explicit schema dict (polars
    cannot infer column types from an empty list).

    Returns the DataFrame after writing.
    """
    Path(PARQUET_OUTPUT).parent.mkdir(parents=True, exist_ok=True)

    if not records:
        # Zero-row DataFrame with explicit schema — verified working on Windows
        df = pl.DataFrame({k: [] for k in SCHEMA}, schema=SCHEMA)
    else:
        df = pl.DataFrame(
            records,
            schema=SCHEMA,
            infer_schema_length=len(records),
        )

    df.write_parquet(PARQUET_OUTPUT)
    print(f"Escribio {len(df)} registros en {PARQUET_OUTPUT}")
    return df


# ---------------------------------------------------------------------------
# Linter
# ---------------------------------------------------------------------------

def run_linter(parquet_path: str) -> None:
    """Verify no raw DNI column survived to the output Parquet.

    Aborts with sys.exit(1) if any column name matches "dni", "documento",
    or "document" (case-insensitive).  The sentinel string stored in the
    "dni_hash" column is NOT a leak and is not checked here.
    """
    df = pl.read_parquet(parquet_path)
    forbidden = [c for c in df.columns if c.lower() in ("dni", "documento", "document")]
    if forbidden:
        print(
            f"LINTER FAIL: columna(s) prohibida(s) {forbidden} en {parquet_path}",
            flush=True,
        )
        sys.exit(1)
    print(
        f"Linter OK: {len(df)} registros, sin columna DNI cruda. "
        f"Salida: {parquet_path}"
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Orchestrate fetch → transform → write → lint."""
    load_dotenv()

    KEY = os.environ.get("KEY_OP_FRIO", "")
    URL = os.environ.get("URL_OP_FRIO", "")
    if not KEY or not URL:
        print(
            "ERROR: KEY_OP_FRIO y URL_OP_FRIO deben estar definidos en .env"
        )
        sys.exit(1)

    raw_records = fetch_all_submissions(URL, KEY)

    clean_records = [
        r for rec in raw_records if (r := transform_record(rec)) is not None
    ]
    print(
        f"Transformados: {len(clean_records)} registros validos "
        f"({len(raw_records) - len(clean_records)} omitidos)"
    )

    df = write_parquet(clean_records)  # noqa: F841 — df retained for future use
    run_linter(PARQUET_OUTPUT)


if __name__ == "__main__":
    main()
