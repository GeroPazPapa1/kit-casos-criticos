import { useState } from 'react'
import { useCasosCriticos } from '@/hooks/useCasosCriticos'
import { MapView } from '@/components/MapView'

const opcionesRiesgo = [
  'Código Verde sin PPH',
  'Código Verde con PPH',
  'Código Amarillo',
  'Código Rojo',
]

const normalizar = (valor: unknown) =>
  String(valor ?? '')
    .toLowerCase()
    .trim()

const normalizarDni = (valor: unknown) =>
  String(valor ?? '').replace(/\D/g, '')

const getCampoTexto = (caso: Record<string, unknown>, claves: string[]) => {
  for (const clave of claves) {
    const valor = caso[clave]
    if (typeof valor === 'string' && valor.trim()) return valor.trim()
    if (typeof valor === 'number') return String(valor)
  }

  return ''
}

const getRiesgoSanitario = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'riesgo_sanitario',
    'riesgoSanitario',
    'riesgo',
    'Riesgo sanitario',
    'Riesgo Sanitario',
  ])

const getDni = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['dni', 'DNI', 'documento', 'Documento'])

const getNombre = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['nombre', 'Nombre', 'nombre_persona', 'Nombre persona'])

const getApellido = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['apellido', 'Apellido', 'apellido_persona', 'Apellido persona'])

const getComuna = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['comuna', 'Comuna', 'comuna_calculada'])

const getBrigadista = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['brigadista', 'Brigadista'])

const getOperadorRed = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['operador_red', 'operadorRed', 'Operador RED', 'operador'])

const getFecha = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['_submission_time', 'submission_time', 'fecha', 'Fecha'])

const getDerivacion = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['tipo_derivacion', 'derivacion', 'Tipo de derivación'])

const getSame = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['same', 'SAME', 'derivacion_same', 'Derivación SAME'])

const getHospital = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['hospital', 'traslado_hospitalario', 'Traslado hospitalario'])

const getSeguimiento = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['seguimiento', 'requiere_seguimiento', 'Requiere seguimiento'])

const getConsumo = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['consumo_activo', 'consumo_problematico', 'Consumo activo'])

const getCis = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['desea_ingresar_cis', 'cis', 'Desea ingresar a CIS'])

const esSi = (valor: string) => {
  const v = normalizar(valor)
  return v === 'si' || v === 'sí' || v === 'true' || v === '1'
}

export function CasosCriticosDashboard() {
  const state = useCasosCriticos()
  const [riesgoFiltro, setRiesgoFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')

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

  const casosFiltrados = casos.filter(caso => {
    const cumpleRiesgo =
      !riesgoFiltro || getRiesgoSanitario(caso) === riesgoFiltro

    const textoBusqueda = normalizar(busqueda)
    const dniBusqueda = normalizarDni(busqueda)

    const camposTexto = [
      getNombre(caso),
      getApellido(caso),
      getOperadorRed(caso),
      getBrigadista(caso),
    ].join(' ')

    const cumpleBusqueda =
      !busqueda ||
      normalizar(camposTexto).includes(textoBusqueda) ||
      normalizarDni(getDni(caso)).includes(dniBusqueda)

    return cumpleRiesgo && cumpleBusqueda
  })

  const personasUnicas = new Set(
    casosFiltrados.map(caso => normalizarDni(getDni(caso))).filter(Boolean),
  ).size

  const casosCriticos = casosFiltrados.filter(caso => {
    const riesgo = getRiesgoSanitario(caso)
    return riesgo === 'Código Amarillo' || riesgo === 'Código Rojo'
  }).length

  const casosSame = casosFiltrados.filter(caso => esSi(getSame(caso))).length
  const trasladosHospital = casosFiltrados.filter(caso => esSi(getHospital(caso))).length
  const casosSeguimiento = casosFiltrados.filter(caso => esSi(getSeguimiento(caso))).length

  const casosPorRiesgo = opcionesRiesgo.map(riesgo => ({
    riesgo,
    total: casosFiltrados.filter(caso => getRiesgoSanitario(caso) === riesgo).length,
  }))

  const maxRiesgo = Math.max(...casosPorRiesgo.map(r => r.total), 1)

  const casosPorDia = Object.entries(
    casosFiltrados.reduce<Record<string, number>>((acc, caso) => {
      const fechaRaw = getFecha(caso)
      if (!fechaRaw) return acc

      const fecha = new Date(fechaRaw).toISOString().slice(0, 10)
      acc[fecha] = (acc[fecha] || 0) + 1

      return acc
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b))

  const maxDia = Math.max(...casosPorDia.map(([, total]) => total), 1)

  const derivaciones = Object.entries(
    casosFiltrados.reduce<Record<string, number>>((acc, caso) => {
      const tipo = getDerivacion(caso) || 'Sin dato'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const maxDerivacion = Math.max(...derivaciones.map(([, total]) => total), 1)

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
        <h1 className="text-sm font-semibold">Casos Críticos Sanitarios</h1>
        <p className="text-xs text-slate-400">
          Total de registros:{' '}
          <span className="text-white font-semibold">{meta.total}</span>
        </p>
      </header>

      {/* KPIs */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Intervenciones</div>
            <div className="text-white text-2xl font-bold">{casosFiltrados.length}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Personas únicas</div>
            <div className="text-white text-2xl font-bold">{personasUnicas || '-'}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Casos críticos</div>
            <div className="text-white text-2xl font-bold">{casosCriticos}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Casos con SAME</div>
            <div className="text-white text-2xl font-bold">{casosSame}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Traslados hospital</div>
            <div className="text-white text-2xl font-bold">{trasladosHospital}</div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">Con seguimiento</div>
            <div className="text-white text-2xl font-bold">{casosSeguimiento}</div>
          </div>
        </div>
      </section>

      {/* Segmentadores y buscadores */}
      <section className="bg-slate-800 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Riesgo sanitario
            </label>
            <select
              value={riesgoFiltro}
              onChange={e => setRiesgoFiltro(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-64"
            >
              <option value="">Todos los riesgos</option>
              {opcionesRiesgo.map(riesgo => (
                <option key={riesgo} value={riesgo}>
                  {riesgo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="DNI, nombre, apellido, operador o brigadista"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-96"
            />
          </div>

          <button
            onClick={() => {
              setRiesgoFiltro('')
              setBusqueda('')
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* Gráficos */}
      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-white text-sm font-semibold mb-1">
              Casos por riesgo sanitario
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Distribución de intervenciones según nivel de riesgo.
            </p>

            {casosFiltrados.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="space-y-3">
                {casosPorRiesgo.map(({ riesgo, total }) => (
                  <div key={riesgo}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{riesgo}</span>
                      <span className="text-white font-semibold">{total}</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${(total / maxRiesgo) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-white text-sm font-semibold mb-1">
              Intervenciones por día
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Serie temporal de intervenciones registradas.
            </p>

            {casosPorDia.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="flex items-end gap-3 h-44 overflow-x-auto pb-6">
                {casosPorDia.map(([fecha, total]) => (
                  <div key={fecha} className="flex flex-col items-center min-w-14">
                    <div className="text-slate-300 text-xs mb-1">{total}</div>
                    <div
                      className="w-9 bg-cyan-500 rounded-t"
                      style={{ height: `${(total / maxDia) * 130}px` }}
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
              Tipo de derivación
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Distribución según tipo de derivación registrado.
            </p>

            {derivaciones.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">
                Sin datos para graficar.
              </div>
            ) : (
              <div className="space-y-3">
                {derivaciones.map(([tipo, total]) => (
                  <div key={tipo}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{tipo}</span>
                      <span className="text-white font-semibold">{total}</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(total / maxDerivacion) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabla de seguimiento */}
      <section className="p-4 bg-slate-900 flex-shrink-0">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white text-sm font-semibold">
              Seguimiento de casos críticos
            </h2>
            <p className="text-slate-400 text-xs">
              Tabla operativa para monitorear casos complejos y derivaciones.
            </p>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-slate-300 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Apellido</th>
                  <th className="px-4 py-2 text-left">DNI</th>
                  <th className="px-4 py-2 text-left">Comuna</th>
                  <th className="px-4 py-2 text-left">Riesgo</th>
                  <th className="px-4 py-2 text-left">Consumo activo</th>
                  <th className="px-4 py-2 text-left">CIS</th>
                  <th className="px-4 py-2 text-left">Seguimiento</th>
                  <th className="px-4 py-2 text-left">SAME</th>
                  <th className="px-4 py-2 text-left">Hospital</th>
                </tr>
              </thead>

              <tbody>
                {casosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-slate-400">
                      Todavía no hay casos críticos cargados o no hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  casosFiltrados.map((caso, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-700 hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-2 text-white">{getFecha(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getNombre(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getApellido(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getDni(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getComuna(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getRiesgoSanitario(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getConsumo(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getCis(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getSeguimiento(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getSame(caso) || '—'}</td>
                      <td className="px-4 py-2 text-white">{getHospital(caso) || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="p-4 bg-slate-900">
        <div className="mb-2">
          <h2 className="text-white text-sm font-semibold">Mapa de casos críticos</h2>
          <p className="text-slate-400 text-xs">
            Los puntos aparecerán cuando el ETL transforme las coordenadas del formulario a latitud y longitud.
          </p>
        </div>

        <MapView
          entregas={[]}
          className="h-[600px] flex-shrink-0 rounded-lg overflow-hidden border border-slate-700"
        />
      </section>
    </div>
  )
}