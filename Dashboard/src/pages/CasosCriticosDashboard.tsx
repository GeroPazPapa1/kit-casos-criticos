import { useCasosCriticos } from '@/hooks/useCasosCriticos'

export function CasosCriticosDashboard() {
  const state = useCasosCriticos()

  if (state.status === 'loading') {
    return (
      <div className="h-full bg-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Cargando casos críticos…</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="h-full bg-slate-900 flex items-center justify-center p-8">
        <span className="text-red-400 text-sm">Error al cargar casos críticos</span>
      </div>
    )
  }

  const { casos, meta } = state

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
        <h1 className="text-sm font-semibold">Casos Críticos Sanitarios</h1>
        <p className="text-xs text-slate-400">
          Total de registros: <span className="text-white font-semibold">{meta.total}</span>
        </p>
      </header>

      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Casos registrados</div>
            <div className="text-white text-2xl font-bold">{casos.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Riesgo rojo</div>
            <div className="text-white text-2xl font-bold">-</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Derivados SAME/Hospital</div>
            <div className="text-white text-2xl font-bold">-</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Requieren seguimiento</div>
            <div className="text-white text-2xl font-bold">-</div>
          </div>
        </div>
      </section>

      <section className="bg-slate-800 border-b border-slate-700 p-4 flex-shrink-0">
        <p className="text-slate-400 text-sm">
          Próximo paso: mapear los nombres reales de columnas cuando haya registros cargados en Kobo.
        </p>
      </section>

      <section className="p-4 bg-slate-900 flex-1 min-h-0 overflow-auto">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white text-sm font-semibold">Detalle de casos críticos</h2>
            <p className="text-slate-400 text-xs">
              Listado de registros provenientes del formulario de Casos Críticos Sanitarios
            </p>
          </div>

          <div className="p-8 text-center text-slate-400 text-sm">
            {casos.length === 0
              ? 'Todavía no hay casos críticos cargados en el formulario.'
              : 'Hay registros cargados. Próximo paso: mapear columnas y construir la tabla.'}
          </div>
        </div>
      </section>
    </div>
  )
}