import { BrowserRouter, NavLink, Routes, Route } from 'react-router-dom'
import { KitFrioDashboard } from '@/pages/KitFrioDashboard'
import { CasosCriticosDashboard } from '@/pages/CasosCriticosDashboard'

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-slate-900">
        <nav className="bg-slate-950 border-b border-slate-700 px-4 py-3 flex gap-3 flex-shrink-0">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-4 py-2 rounded text-sm font-semibold ${
                isActive
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            Kit Frío
          </NavLink>

          <NavLink
            to="/casos-criticos"
            className={({ isActive }) =>
              `px-4 py-2 rounded text-sm font-semibold ${
                isActive
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            Casos Críticos
          </NavLink>
        </nav>

        <div className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<KitFrioDashboard />} />
            <Route path="/casos-criticos" element={<CasosCriticosDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App