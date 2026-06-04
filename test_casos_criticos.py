import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("KEY_OP_FRIO")
URL = os.getenv("URL_CASOS_CRITICOS")

headers = {
    "Authorization": f"Token {TOKEN}"
}

response = requests.get(URL, headers=headers)

print("Status code:", response.status_code)

if response.status_code != 200:
    print(response.text)
    exit()

data = response.json()

results = data.get("results", [])

print("Cantidad de registros:", len(results))

if len(results) == 0:
    print("No hay registros cargados todavía.")
else:
    primer_registro = results[0]

    print("\nCampos disponibles:")
    for key in primer_registro.keys():
        print("-", key)

    print("\nPrimer registro:")
    print(primer_registro)