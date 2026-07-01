"""
pipeline.py — Operativo Frío ETL script
"""

import hashlib
import os
import sys
from pathlib import Path

import polars as pl
import requests
from dotenv import load_dotenv

PARQUET_OUTPUT = "data/entregas.parquet"
DNI_SENTINEL = "No brinda/no visible"

SCHEMA = {
    "kobo_id": pl.Int64,
    "lat": pl.Float64,
    "lon": pl.Float64,
    "operator_id": pl.Utf8,
    "id_kit": pl.Utf8,
    "nombre_apellido": pl.Utf8,
    "nombre": pl.Utf8,
    "apellido": pl.Utf8,
    "genero": pl.Utf8,
    "edad": pl.Int64,
    "observaciones": pl.Utf8,
    "dni": pl.Utf8,
    "dni_hash": pl.Utf8,
    "submission_time": pl.Utf8,
}


def fetch_all_submissions(api_url: str, token: str) -> list[dict]:
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
        url = data["next"]
        page += 1
        print(f"  Pagina {page}: {len(batch)} registros (total: {len(records)})")

    print(
        f"Extraccion completa: {len(records)} registros "
        f"(formulario reporta {expected_count})"
    )
    return records


def _safe_int(val) -> int | None:
    if val is None:
        return None
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None


def get_dni_beneficiario(record: dict):
    return (
        record.get("dni")
        or record.get("dni_del_beneficiario")
        or record.get("DNI")
        or record.get("documento")
        or record.get("Documento")
    )


def hash_dni(raw_value) -> str:
    if raw_value is None:
        return DNI_SENTINEL

    v = str(raw_value).strip()

    if not v or v.lower() in ("nan", "none", "null"):
        return DNI_SENTINEL

    salt = os.urandom(16)
    digest = hashlib.sha256(salt + v.encode("utf-8")).hexdigest()

    return f"{salt.hex()}:{digest}"


def clean_dni(raw_value) -> str | None:
    if raw_value is None:
        return None

    v = str(raw_value).strip()

    if not v or v.lower() in ("nan", "none", "null"):
        return None

    return v


def transform_record(record: dict) -> dict | None:
    geo = record.get("_geolocation")

    if not geo:
        print(
            f"  AVISO: omitiendo registro _id={record.get('_id')} "
            f"— sin _geolocation"
        )
        return None

    nombre_apellido = str(record.get("nombre_apellido") or "").strip() or None
    dni_raw = get_dni_beneficiario(record)

    return {
        "kobo_id": int(record["_id"]),
        "lat": float(geo[0]),
        "lon": float(geo[1]),
        "operator_id": str(record.get("operator_id") or "").strip() or None,
        "id_kit": str(record.get("id_kit") or "").strip() or None,
        "nombre_apellido": nombre_apellido,
        "nombre": str(record.get("nombre") or "").strip() or nombre_apellido,
        "apellido": str(record.get("apellido") or "").strip() or None,
        "genero": str(record.get("genero") or "").strip() or None,
        "edad": _safe_int(record.get("edad")),
        "observaciones": str(record.get("observaciones") or "").strip() or None,
        "dni": clean_dni(dni_raw),
        "dni_hash": hash_dni(dni_raw),
        "submission_time": str(record.get("_submission_time") or "").strip() or None,
    }


def write_parquet(records: list[dict]) -> pl.DataFrame:
    Path(PARQUET_OUTPUT).parent.mkdir(parents=True, exist_ok=True)

    if not records:
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


def run_linter(parquet_path: str) -> None:
    df = pl.read_parquet(parquet_path)

    forbidden = [
        c for c in df.columns
        if c.lower() in ("documento", "document")
    ]

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


def main() -> None:
    load_dotenv()

    key = os.environ.get("KEY_OP_FRIO", "")
    url = os.environ.get("URL_OP_FRIO", "")

    if not key or not url:
        print("ERROR: KEY_OP_FRIO y URL_OP_FRIO deben estar definidos en .env")
        sys.exit(1)

    raw_records = fetch_all_submissions(url, key)

    clean_records = [
        r for rec in raw_records if (r := transform_record(rec)) is not None
    ]

    print(
        f"Transformados: {len(clean_records)} registros validos "
        f"({len(raw_records) - len(clean_records)} omitidos)"
    )

    write_parquet(clean_records)
    run_linter(PARQUET_OUTPUT)


if __name__ == "__main__":
    main()