import json
import os
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv


load_dotenv()

TOKEN = os.getenv("KEY_OP_FRIO")
URL = os.getenv("URL_CASOS_CRITICOS")

OUTPUT_DIR = Path("Dashboard/public/data/dist")
OUTPUT_JSON = OUTPUT_DIR / "casos_criticos.json"
OUTPUT_META = OUTPUT_DIR / "casos_criticos_meta.json"


def fetch_casos_criticos():
    if not TOKEN:
        raise ValueError("No se encontró KEY_OP_FRIO en .env")

    if not URL:
        raise ValueError("No se encontró URL_CASOS_CRITICOS en .env")

    headers = {
        "Authorization": f"Token {TOKEN}"
    }

    results = []
    url = URL

    while url:
        response = requests.get(url, headers=headers)
        print("Status code:", response.status_code)

        if response.status_code != 200:
            print(response.text)
            raise RuntimeError("Error consultando Kobo Casos Críticos")

        data = response.json()
        page_results = data.get("results", [])

        results.extend(page_results)
        print(f"Página descargada: {len(page_results)} registros | Total: {len(results)}")

        url = data.get("next")

    return results


def main():
    print("=" * 60)
    print("PIPELINE CASOS CRÍTICOS")
    print("=" * 60)

    registros = fetch_casos_criticos()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)

    meta = {
        "total": len(registros),
        "timestamp": datetime.now().isoformat(),
        "source": "kobo_casos_criticos",
    }

    with open(OUTPUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Registros descargados: {len(registros)}")
    print(f"JSON generado: {OUTPUT_JSON}")
    print(f"Meta generado: {OUTPUT_META}")


if __name__ == "__main__":
    main()