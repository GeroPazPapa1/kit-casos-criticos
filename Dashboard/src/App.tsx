import { useState } from 'react'
import { useEntregas } from '@/hooks/useEntregas'
import { Header } from '@/components/Header'
import { MapView } from '@/components/MapView'

function App() {
  const state = useEntregas()
  const [fechaFiltro, setFechaFiltro] = useState('')

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
  if (!fechaFiltro) return true
  if (!e.submission_time) return false

  const fechaEntrega = new Date(e.submission_time)
    .toISOString()
    .slice(0, 10)

  return fechaEntrega === fechaFiltro
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

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <Header total={meta.total} timestamp={meta.timestamp} />

      {/* KPIs */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Kits entregados</div>
            <div className="text-white text-2xl font-bold">{entregasFiltradas.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Personas registradas</div>
            <div className="text-white text-2xl font-bold">{entregasFiltradas.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Edad promedio</div>
            <div className="text-white text-2xl font-bold">-</div>
          </div>
        </div>
      </section>
{/* Filtros */}
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

    <button
      onClick={() => setFechaFiltro('')}
      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
    >
      Limpiar filtros
    </button>
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
                      colSpan={6}
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

      {/* Mapa: queda directo como hijo flex para no romper Leaflet */}
      <MapView entregas={validEntregas} />
    </div>
  )
}

export default App