// MapView.tsx — full Leaflet map with commune boundaries, clustered delivery markers,
// and popup details.
//
// D-03: commune polygons are static borders only, interactive: false
// D-04: border style color '#94a3b8' weight 1 fillOpacity 0
// D-05: basemap CARTO dark_all
// D-07: center [-34.61, -58.44], zoom 12
// D-01: MarkerClusterGroup (react-leaflet-cluster)
// D-02: default markercluster visual (no custom CSS)
// D-12: popup shows nombre, apellido, genero, edad, observaciones only
// D-13: null values display as em-dash '—'
// SECURITY: dni_hash must NEVER appear in any JSX expression in this file

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { GeoJsonObject } from 'geojson'
import type { Entrega } from '@/types/domain'

// Commune polygon style — D-03, D-04
const COMMUNE_STYLE = {
  color: '#94a3b8',   // slate-400
  weight: 1,
  fillOpacity: 0,
  interactive: false as const,  // D-03: no hover, no click, no tooltip
}

interface MapViewProps {
  entregas: Entrega[]
  className?: string
}

export const MapView = ({ entregas, className = 'flex-1 min-h-0' }: MapViewProps) => {
  const [comunas, setComunas] = useState<GeoJsonObject | null>(null)
  const [comunasError, setComunasError] = useState<boolean>(false)

  useEffect(() => {
    // Runtime fetch — ~200KB GeoJSON is too large to bundle; served from public/comunas/
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

  return (
    // flex-1: fills remaining viewport height after Header.
    // min-h-0: overrides flex default min-height:auto — without this the map div
    // may collapse to 0 height on some browsers.
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
        {/* D-05: CARTO dark basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* D-03/D-04: Commune boundaries — conditional render because GeoJSON data
            prop is immutable in react-leaflet v5. Never mount with null then swap. */}
        {comunas && (
          <GeoJSON data={comunas} style={COMMUNE_STYLE} />
        )}

        {/* D-01/D-02: Marker clustering with default leaflet.markercluster style */}
        <MarkerClusterGroup chunkedLoading>
          {entregas.map(e => (
            <Marker key={e.id} position={[e.lat, e.lon]}>
              <Popup>
                {/* Popup content uses React text nodes only (no raw HTML injection).
                 * React auto-escapes all string values, preventing XSS from data fields.
                 * SECURITY: do not add the hash field or submission_time here. */}
                <div className="p-2 text-slate-900 text-xs space-y-0.5">
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
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
