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

GEOJSON_DIR = Path("Dashboard/public/comunas")


COMUNAS_REFERENCIA = {
    "1": {"lat": -34.611, "lon": -58.382, "label": "Comuna 1"},
    "2": {"lat": -34.589, "lon": -58.393, "label": "Comuna 2"},
    "3": {"lat": -34.612, "lon": -58.405, "label": "Comuna 3"},
    "4": {"lat": -34.642, "lon": -58.391, "label": "Comuna 4"},
    "5": {"lat": -34.616, "lon": -58.421, "label": "Comuna 5"},
    "6": {"lat": -34.618, "lon": -58.443, "label": "Comuna 6"},
    "7": {"lat": -34.639, "lon": -58.448, "label": "Comuna 7"},
    "8": {"lat": -34.668, "lon": -58.460, "label": "Comuna 8"},
    "9": {"lat": -34.651, "lon": -58.506, "label": "Comuna 9"},
    "10": {"lat": -34.625, "lon": -58.508, "label": "Comuna 10"},
    "11": {"lat": -34.606, "lon": -58.495, "label": "Comuna 11"},
    "12": {"lat": -34.567, "lon": -58.485, "label": "Comuna 12"},
    "13": {"lat": -34.557, "lon": -58.455, "label": "Comuna 13"},
    "14": {"lat": -34.582, "lon": -58.421, "label": "Comuna 14"},
    "15": {"lat": -34.588, "lon": -58.455, "label": "Comuna 15"},
}


def fetch_casos_criticos():
    if not TOKEN:
        raise ValueError("No se encontró KEY_OP_FRIO en .env")

    if not URL:
        raise ValueError("No se encontró URL_CASOS_CRITICOS en .env")

    headers = {"Authorization": f"Token {TOKEN}"}

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


def buscar_geojson_comunas():
    posibles = [
        GEOJSON_DIR / "Comunas.json",
        GEOJSON_DIR / "comunas.json",
        GEOJSON_DIR / "COMUNAS.json",
    ]

    for path in posibles:
        if path.exists():
            return path

    return None


def punto_en_anillo(lon, lat, anillo):
    dentro = False
    j = len(anillo) - 1

    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]

        cruza = (yi > lat) != (yj > lat)
        if cruza:
            x_intersecta = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
            if lon < x_intersecta:
                dentro = not dentro

        j = i

    return dentro


def punto_en_poligono(lon, lat, coordenadas):
    if not coordenadas:
        return False

    exterior = coordenadas[0]
    agujeros = coordenadas[1:]

    if not punto_en_anillo(lon, lat, exterior):
        return False

    for agujero in agujeros:
        if punto_en_anillo(lon, lat, agujero):
            return False

    return True


def punto_en_geometria(lon, lat, geometria):
    tipo = geometria.get("type")
    coordenadas = geometria.get("coordinates", [])

    if tipo == "Polygon":
        return punto_en_poligono(lon, lat, coordenadas)

    if tipo == "MultiPolygon":
        return any(
            punto_en_poligono(lon, lat, poligono)
            for poligono in coordenadas
        )

    return False


def cargar_poligonos_comunas():
    path = buscar_geojson_comunas()

    if not path:
        print("No se encontró GeoJSON de comunas. Se usará la comuna original si viene en Kobo.")
        return []

    print(f"Cargando GeoJSON de comunas: {path}")

    with open(path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    poligonos = []

    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        geometria = feature.get("geometry", {})

        comuna = (
            props.get("comuna")
            or props.get("COMUNA")
            or props.get("Comuna")
            or props.get("numero")
            or props.get("N_COMUNA")
        )

        if comuna is None:
            continue

        comuna = str(comuna).replace("Comuna", "").replace("comuna", "").strip()

        poligonos.append({
            "comuna": comuna,
            "geometry": geometria,
        })

    print(f"Polígonos de comunas cargados: {len(poligonos)}")
    return poligonos


def extraer_lat_lon(registro):
    geolocation = registro.get("_geolocation")

    if isinstance(geolocation, list) and len(geolocation) >= 2:
        try:
            lat = float(geolocation[0])
            lon = float(geolocation[1])
            return lat, lon
        except Exception:
            pass

    ubicacion = registro.get("ubicacion")

    if isinstance(ubicacion, str) and ubicacion.strip():
        partes = ubicacion.strip().split()

        if len(partes) >= 2:
            try:
                lat = float(partes[0])
                lon = float(partes[1])
                return lat, lon
            except Exception:
                pass

    return None, None


def calcular_comuna_por_geojson(lat, lon, poligonos):
    if lat is None or lon is None:
        return ""

    for item in poligonos:
        if punto_en_geometria(lon, lat, item["geometry"]):
            return item["comuna"]

    return ""


def normalizar_registros(registros, poligonos):
    registros_limpios = []

    asignadas_geojson = 0
    asignadas_original = 0
    sin_comuna = 0

    for registro in registros:
        r = dict(registro)

        lat, lon = extraer_lat_lon(r)

        if lat is not None and lon is not None:
            r["lat"] = lat
            r["lon"] = lon

        comuna_original = str(r.get("comuna") or "").strip()
        comuna_geojson = calcular_comuna_por_geojson(lat, lon, poligonos)

        if comuna_geojson:
            r["comuna"] = comuna_geojson
            asignadas_geojson += 1
        elif comuna_original:
            r["comuna"] = comuna_original
            asignadas_original += 1
        else:
            r["comuna"] = ""
            sin_comuna += 1

        ref = COMUNAS_REFERENCIA.get(str(r["comuna"]))
        if ref:
            r["comuna_lat"] = ref["lat"]
            r["comuna_lon"] = ref["lon"]
            r["comuna_label"] = ref["label"]

        registros_limpios.append(r)

    print("Asignación de comunas:")
    print(f"  Por GeoJSON: {asignadas_geojson}")
    print(f"  Por columna original: {asignadas_original}")
    print(f"  Sin comuna: {sin_comuna}")

    return registros_limpios


def main():
    print("=" * 60)
    print("PIPELINE CASOS CRÍTICOS")
    print("=" * 60)

    registros = fetch_casos_criticos()
    poligonos = cargar_poligonos_comunas()
    registros = normalizar_registros(registros, poligonos)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)

    comunas_presentes = sorted(
        {
            str(r.get("comuna"))
            for r in registros
            if str(r.get("comuna") or "").strip()
        },
        key=lambda x: float(x) if x.replace(".", "", 1).isdigit() else 999,
    )

    meta = {
        "total": len(registros),
        "timestamp": datetime.now().isoformat(),
        "source": "kobo_casos_criticos",
        "comunas": comunas_presentes,
        "labels_comunas": {
            comuna: COMUNAS_REFERENCIA.get(comuna, {}).get("label", f"Comuna {comuna}")
            for comuna in comunas_presentes
        },
        "centroides_comunas": COMUNAS_REFERENCIA,
    }

    with open(OUTPUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Registros descargados: {len(registros)}")
    print(f"JSON generado: {OUTPUT_JSON}")
    print(f"Meta generado: {OUTPUT_META}")


if __name__ == "__main__":
    main()