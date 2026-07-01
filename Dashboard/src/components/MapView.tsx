import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { GeoJsonObject } from 'geojson'
import type { Entrega } from '@/types/domain'

const COMMUNE_STYLE = {
color: '#94a3b8',
weight: 1,
fillOpacity: 0,
interactive: false as const,
}

type EntregaConComuna = Entrega & {
comuna?: string
comuna_label?: string
comuna_lat?: number
comuna_lon?: number
riesgo_sanitario?: string
Tipo_de_derivaci_n?: string
}

interface MapViewProps {
entregas: EntregaConComuna[]
className?: string
}

const getMarkerLat = (e: EntregaConComuna) => e.comuna_lat ?? e.lat
const getMarkerLon = (e: EntregaConComuna) => e.comuna_lon ?? e.lon

export const MapView = ({ entregas, className = 'flex-1 min-h-0' }: MapViewProps) => {
const [comunas, setComunas] = useState<GeoJsonObject | null>(null)
const [comunasError, setComunasError] = useState<boolean>(false)

useEffect(() => {
fetch('/comunas/Comunas.json')
.then(r => {
if (!r.ok) throw new Error(`${r.status} fetching Comunas.json`)
return r.json()
})
.then((data: GeoJsonObject) => setComunas(data))
.catch(err => {
console.error(err)
setComunasError(true)
})
}, [])

const puntosValidos = entregas.filter(e => {
const lat = getMarkerLat(e)
const lon = getMarkerLon(e)

return (
Number.isFinite(lat) &&
Number.isFinite(lon) &&
lat >= -90 &&
lat <= 90 &&
lon >= -180 &&
lon <= 180
)
})

return (
<div className={`${className} relative`}>
{comunasError && (
<div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-red-800 text-white text-xs px-3 py-1 rounded shadow pointer-events-none">
No se pudieron cargar los límites de comunas
</div>
)}

<MapContainer
center={[-34.61, -58.44]}
zoom={12}
style={{ height: '100%', width: '100%' }}
>
<TileLayer
url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
/>

{comunas && <GeoJSON data={comunas} style={COMMUNE_STYLE} />}

<MarkerClusterGroup chunkedLoading>
{puntosValidos.map((e, index) => {
const lat = getMarkerLat(e)
const lon = getMarkerLon(e)

return (
<Marker key={e.id ?? index} position={[lat, lon]}>
<Popup>
<div className="p-2 text-slate-900 text-xs space-y-0.5">
{e.comuna_label && (
<div>
<span className="text-slate-500">Comuna </span>
<b>{e.comuna_label}</b>
</div>
)}

{e.riesgo_sanitario && (
<div>
<span className="text-slate-500">Riesgo </span>
<b>{e.riesgo_sanitario}</b>
</div>
)}

{e.Tipo_de_derivaci_n && (
<div>
<span className="text-slate-500">Tipo </span>
<b>{e.Tipo_de_derivaci_n}</b>
</div>
)}

<div>
<span className="text-slate-500">Nombre </span>
<b>{e.nombre ?? '—'}</b>
</div>

<div>
<span className="text-slate-500">Apellido </span>
<b>{e.apellido ?? '—'}</b>
</div>

<div>
<span className="text-slate-500">Género </span>
<b>{e.genero ?? '—'}</b>
</div>

<div>
<span className="text-slate-500">Edad </span>
<b>{e.edad ?? '—'}</b>
</div>

{e.observaciones && (
<div>
<span className="text-slate-500">Observaciones </span>
<b>{e.observaciones}</b>
</div>
)}
</div>
</Popup>
</Marker>
)
})}
</MarkerClusterGroup>
</MapContainer>
</div>
)
}