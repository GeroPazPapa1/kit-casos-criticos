import { useState } from 'react'
import { useEntregas } from '@/hooks/useEntregas'
import { Header } from '@/components/Header'
import { MapView } from '@/components/MapView'

const normalizarDni = (valor: string) => valor.replace(/\D/g, '')

export function KitFrioDashboard() {
  const state = useEntregas()
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [dniFiltro, setDniFiltro] = useState('')

  if (state.status === 'loading') {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Cargando mapa…</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-8">
        <span className="text-red-400 text-sm">Error al cargar los datos</span>
      </div>
    )
  }

  const { entregas, meta } = state

  const entregasFiltradas = entregas.filter(e => {
    const cumpleFecha = (() => {
      if (!fechaFiltro) return true
      if (!e.submission_time) return false

      const fechaEntrega = new Date(e.submission_time)
        .toISOString()
        .slice(0, 10)

      return fechaEntrega === fechaFiltro
    })()

    const dniBuscado = normalizarDni(dniFiltro)
    const dniRegistro = normalizarDni(e.dni ?? '')
    const cumpleDni = !dniBuscado || dniRegistro.includes(dniBuscado)

    return cumpleFecha && cumpleDni
  })

  const validEntregas = entregasFiltradas.filter(
    e =>
      isFinite(e.lat) &&
      isFinite(e.lon) &&
      e.lat >= -90 &&
      e.lat <= 90 &&
      e.lon >= -180 &&
      e.lon <= 180,
  )

  const personasUnicas = new Set(
    entregasFiltradas
      .map(e => normalizarDni(e.dni ?? ''))
      .filter(Boolean),
  ).size

  const diasConEntregas = new Set(
    entregasFiltradas
      .map(e => {
        if (!e.submission_time) return null
        return new Date(e.submission_time).toISOString().slice(0, 10)
      })
      .filter(Boolean),
  ).size

  const promedioDiario =
    diasConEntregas > 0
      ? (entregasFiltradas.length / diasConEntregas).toFixed(1)
      : '-'

  const puntosEntrega = new Set(
    validEntregas.map(e => `${e.lat.toFixed(5)},${e.lon.toFixed(5)}`),
  ).size

  const georreferenciadas = validEntregas.length

  const kitsPorFecha = Object.entries(
    entregasFiltradas.reduce<Record<string, number>>((acc, e) => {
      if (!e.submission_time) return acc

      const fecha = new Date(e.submission_time).toISOString().slice(0, 10)
      acc[fecha] = (acc[fecha] || 0) + 1

      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b))

  let acumulado = 0
  const entregasAcumuladas = kitsPorFecha.map(([fecha, total]) => {
    acumulado += total
    return [fecha, acumulado] as const
  })

  const kitsPorGenero = Object.entries(
    entregasFiltradas.reduce<Record<string, number>>((acc, e) => {
      const genero = e.genero || 'Sin dato'
      acc[genero] = (acc[genero] || 0) + 1

      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const maxFecha = Math.max(...kitsPorFecha.map(([, total]) => total), 1)
  const maxAcumulado = Math.max(...entregasAcumuladas.map(([, total]) => total), 1)
  const maxGenero = Math.max(...kitsPorGenero.map(([, total]) => total), 1)

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header total={meta.total} timestamp={meta.timestamp} />

      {/* KPIs principales */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Kits entregados</div>
            <div className="text-white text-2xl font-bold">{entregasFiltradas.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Personas asistidas</div>
            <div className="text-white text-2xl font-bold">{entregasFiltradas.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Personas únicas</div>
            <div className="text-white text-2xl font-bold">{personasUnicas || '-'}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Promedio diario</div>
            <div className="text-white text-2xl font-bold">{promedioDiario}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Puntos entrega</div>
            <div className="text-white text-2xl font-bold">{puntosEntrega || '-'}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Georreferenciadas</div>
            <div className="text-white text-2xl font-bold">{georreferenciadas}</div>
          </div>
        </div>
      </section>

      {/* Segmentadores y buscador */}
      <section className="bg-slate-800 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={e => setFechaFiltro(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              DNI
            </label>
            <input
              type="text"
              value={dniFiltro}
              onChange={e => setDniFiltro(e.target.value)}
              placeholder="Buscar DNI"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setFechaFiltro('')
              setDniFiltro('')
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* Gráficos sugeridos */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-white text-sm font-semibold mb-1">
              Entregas por día
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Cantidad de kits entregados por fecha.
            </p>

            {kitsPorFecha.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="flex items-end gap-3 h-44 overflow-x-auto pb-6">
                {kitsPorFecha.map(([fecha, total]) => (
                  <div key={fecha} className="flex flex-col items-center min-w-14">
                    <div className="text-slate-300 text-xs mb-1">{total}</div>
                    <div
                      className="w-9 bg-cyan-500 rounded-t"
                      style={{ height: `${(total / maxFecha) * 130}px` }}
                    />
                    <div className="text-slate-400 text-[10px] mt-2 whitespace-nowrap">
                      {fecha.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-white text-sm font-semibold mb-1">
              Acumulado de entregas
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Evolución acumulada de kits entregados.
            </p>

            {entregasAcumuladas.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="flex items-end gap-3 h-44 overflow-x-auto pb-6">
                {entregasAcumuladas.map(([fecha, total]) => (
                  <div key={fecha} className="flex flex-col items-center min-w-14">
                    <div className="text-slate-300 text-xs mb-1">{total}</div>
                    <div
                      className="w-9 bg-emerald-500 rounded-t"
                      style={{ height: `${(total / maxAcumulado) * 130}px` }}
                    />
                    <div className="text-slate-400 text-[10px] mt-2 whitespace-nowrap">
                      {fecha.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-white text-sm font-semibold mb-1">
              Entregas por género
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Distribución de personas asistidas según género declarado.
            </p>

            {kitsPorGenero.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="space-y-3">
                {kitsPorGenero.map(([genero, total]) => (
                  <div key={genero}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{genero}</span>
                      <span className="text-white font-semibold">{total}</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${(total / maxGenero) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Detalle compacto */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white text-sm font-semibold">Detalle de entregas</h2>
            <p className="text-slate-400 text-xs">
              Registros provenientes del formulario Kit Frío
            </p>
          </div>

          <div className="overflow-x-auto max-h-40">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-slate-300 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">ID kit</th>
                  <th className="px-4 py-2 text-left">DNI</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Apellido</th>
                  <th className="px-4 py-2 text-left">Género</th>
                  <th className="px-4 py-2 text-left">Edad</th>
                  <th className="px-4 py-2 text-left">Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {entregasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      Todavía no hay entregas cargadas en el formulario.
                    </td>
                  </tr>
                ) : (
                  entregasFiltradas.map(e => (
                    <tr
                      key={e.id}
                      className="border-t border-slate-700 hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-300">
                        {e.id}
                      </td>
                      <td className="px-4 py-2 text-white">{e.dni ?? '—'}</td>
                      <td className="px-4 py-2 text-white">{e.nombre ?? '—'}</td>
                      <td className="px-4 py-2 text-white">{e.apellido ?? '—'}</td>
                      <td className="px-4 py-2 text-white">{e.genero ?? '—'}</td>
                      <td className="px-4 py-2 text-white">{e.edad ?? '—'}</td>
                      <td className="px-4 py-2 text-white">{e.observaciones ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="bg-slate-900 p-4">
        <div className="mb-2">
          <h2 className="text-white text-sm font-semibold">Mapa de puntos de entrega</h2>
          <p className="text-slate-400 text-xs">
            Distribución territorial y concentración de asistencia georreferenciada.
          </p>
        </div>

        <MapView
          entregas={validEntregas}
          className="h-[700px] flex-shrink-0 rounded-lg overflow-hidden border border-slate-700"
        />
      </section>
    </div>
  )
}