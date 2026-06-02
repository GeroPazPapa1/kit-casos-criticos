// App.tsx — root component. Single page, no router (D-08).
// Calls useEntregas() once and distributes data to Header and MapView via props.
// The discriminated union (loading | error | ok) ensures MapView only renders
// when data is ready, preventing null-prop runtime errors.

import { useEntregas } from '@/hooks/useEntregas'
import { Header } from '@/components/Header'
import { MapView } from '@/components/MapView'

function App() {
  const state = useEntregas()

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

  // state.status === 'ok' — TypeScript narrows: state.entregas and state.meta are defined
  const { entregas, meta } = state

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <Header total={meta.total} timestamp={meta.timestamp} />
      <MapView entregas={entregas} />
    </div>
  )
}

export default App
