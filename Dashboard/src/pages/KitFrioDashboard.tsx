import { useState } from 'react'
import { useEntregas } from '@/hooks/useEntregas'
import { Header } from '@/components/Header'
import { MapView } from '@/components/MapView'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const normalizarDni = (valor: unknown) => {
  const texto = String(valor ?? '').trim().toLowerCase()

  if (!texto || texto === 'none' || texto === 'null' || texto === 'undefined') {
    return ''
  }

  return texto.replace(/\D/g, '')
}

const getDniUnificado = (entrega: {
  dni?: unknown
  dni_unificado?: unknown
}): string => {
  const dni = entrega.dni_unificado ?? entrega.dni

  if (dni == null || String(dni).trim() === '') {
    return 'SIN DNI'
  }

  return String(dni)
}

const formatearFecha = (valor: unknown) => {
  if (!valor) return '—'

  const fecha = new Date(String(valor))

  if (Number.isNaN(fecha.getTime())) return String(valor)

  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatearTemperatura = (valor: number | null | undefined) => {
  if (valor == null || !Number.isFinite(valor)) return '—'

  return `${valor.toFixed(1)} °C`
}

const escaparCsv = (valor: unknown) => {
  const texto = String(valor ?? '')
  return `"${texto.replace(/"/g, '""')}"`
}

const descargarCsv = (
  nombreArchivo: string,
  encabezados: string[],
  filas: Array<Array<unknown>>,
) => {
  const contenido = [
    encabezados.map(escaparCsv).join(','),
    ...filas.map(fila => fila.map(escaparCsv).join(',')),
  ].join('\n')

  const blob = new Blob([`\uFEFF${contenido}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function KitFrioDashboard() {
  const state = useEntregas()

  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState('')
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState('')
  const [dniBeneficiarioFiltro, setDniBeneficiarioFiltro] = useState('')
  const [dniOperadorFiltro, setDniOperadorFiltro] = useState('')
  const [temperaturaMinFiltro, setTemperaturaMinFiltro] = useState('')
  const [temperaturaMaxFiltro, setTemperaturaMaxFiltro] = useState('')

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
      if (!fechaDesdeFiltro && !fechaHastaFiltro) return true

      const fechaRaw = e.submission_time_local ?? e.submission_time

      if (!fechaRaw) return false

      const fechaEntrega = new Date(fechaRaw).toISOString().slice(0, 10)

      if (fechaDesdeFiltro && fechaEntrega < fechaDesdeFiltro) return false
      if (fechaHastaFiltro && fechaEntrega > fechaHastaFiltro) return false

      return true
    })()

    const dniBeneficiarioBuscado = normalizarDni(dniBeneficiarioFiltro)
    const dniBeneficiarioRegistro = normalizarDni(getDniUnificado(e))

    const cumpleDniBeneficiario =
      !dniBeneficiarioBuscado ||
      dniBeneficiarioRegistro.includes(dniBeneficiarioBuscado)

    const dniOperadorBuscado = normalizarDni(dniOperadorFiltro)
    const dniOperadorRegistro = normalizarDni(e.operator_id ?? '')

    const cumpleDniOperador =
      !dniOperadorBuscado ||
      dniOperadorRegistro.includes(dniOperadorBuscado)

    const cumpleTemperatura = (() => {
      if (!temperaturaMinFiltro && !temperaturaMaxFiltro) return true

      if (e.temperatura_c == null || !Number.isFinite(e.temperatura_c)) {
        return false
      }

      const temperaturaMin =
        temperaturaMinFiltro === ''
          ? null
          : Number(temperaturaMinFiltro)

      const temperaturaMax =
        temperaturaMaxFiltro === ''
          ? null
          : Number(temperaturaMaxFiltro)

      if (
        temperaturaMin !== null &&
        Number.isFinite(temperaturaMin) &&
        e.temperatura_c < temperaturaMin
      ) {
        return false
      }

      if (
        temperaturaMax !== null &&
        Number.isFinite(temperaturaMax) &&
        e.temperatura_c > temperaturaMax
      ) {
        return false
      }

      return true
    })()

    return (
      cumpleFecha &&
      cumpleDniBeneficiario &&
      cumpleDniOperador &&
      cumpleTemperatura
    )
  })

  const kitsEntregados = entregasFiltradas.filter(e => e.id_kit).length

  const personasAsistidas = entregasFiltradas.filter(
    e => normalizarDni(getDniUnificado(e)).length > 0,
  ).length

  const validEntregas = entregasFiltradas.filter(
    e =>
      isFinite(e.lat) &&
      isFinite(e.lon) &&
      e.lat >= -90 &&
      e.lat <= 90 &&
      e.lon >= -180 &&
      e.lon <= 180,
  )

  const diasConEntregas = new Set(
    entregasFiltradas
      .map(e => {
        const fechaRaw = e.submission_time_local ?? e.submission_time

        if (!fechaRaw) return null

        return new Date(fechaRaw).toISOString().slice(0, 10)
      })
      .filter(Boolean),
  ).size

  const promedioDiario =
    diasConEntregas > 0
      ? (kitsEntregados / diasConEntregas).toFixed(1)
      : '-'

  const puntosEntrega = new Set(
    validEntregas.map(e => `${e.lat.toFixed(5)},${e.lon.toFixed(5)}`),
  ).size

  const georreferenciadas = validEntregas.length

  const kitsPorFecha = Object.entries(
    entregasFiltradas.reduce<Record<string, number>>((acc, e) => {
      const fechaRaw = e.submission_time_local ?? e.submission_time

      if (!fechaRaw) return acc

      const fecha = new Date(fechaRaw).toISOString().slice(0, 10)

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

  const datosGenero = kitsPorGenero.map(([genero, total]) => ({
    genero,
    total,
  }))

  const coloresGenero = [
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
  ]

  const maxFecha = Math.max(
    ...kitsPorFecha.map(([, total]) => total),
    1,
  )

  const maxAcumulado = Math.max(
    ...entregasAcumuladas.map(([, total]) => total),
    1,
  )

  const descargarKitFrioCsv = () => {
    descargarCsv(
      'kit_frio.csv',
      [
        'ID kit',
        'DNI operador',
        'DNI beneficiario',
        'Nombre y apellido',
        'Género',
        'Edad',
        'Observaciones',
        'Fecha',
        'Temperatura °C',
        'Latitud',
        'Longitud',
      ],
      entregasFiltradas.map(e => [
        e.id_kit ?? e.id,
        e.operator_id ?? '',
        getDniUnificado(e),
        e.nombre_apellido ?? e.nombre ?? '',
        e.genero ?? '',
        e.edad ?? '',
        e.observaciones ?? '',
        e.submission_time_local ?? e.submission_time ?? '',
        e.temperatura_c ?? '',
        e.lat,
        e.lon,
      ]),
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header total={meta.total} timestamp={meta.timestamp} />

      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">
              Kits entregados
            </div>

            <div className="text-white text-2xl font-bold">
              {kitsEntregados}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">
              Personas asistidas
            </div>

            <div className="text-white text-2xl font-bold">
              {personasAsistidas}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">
              Promedio diario
            </div>

            <div className="text-white text-2xl font-bold">
              {promedioDiario}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">
              Puntos entrega
            </div>

            <div className="text-white text-2xl font-bold">
              {puntosEntrega || '-'}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-xs uppercase">
              Georreferenciadas
            </div>

            <div className="text-white text-2xl font-bold">
              {georreferenciadas}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-800 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Fecha desde
            </label>

            <input
              type="date"
              value={fechaDesdeFiltro}
              onChange={e => setFechaDesdeFiltro(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Fecha hasta
            </label>

            <input
              type="date"
              value={fechaHastaFiltro}
              onChange={e => setFechaHastaFiltro(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Temperatura mínima °C
            </label>

            <input
              type="number"
              step="0.1"
              value={temperaturaMinFiltro}
              onChange={e => setTemperaturaMinFiltro(e.target.value)}
              placeholder="Ej. 0"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 w-44"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Temperatura máxima °C
            </label>

            <input
              type="number"
              step="0.1"
              value={temperaturaMaxFiltro}
              onChange={e => setTemperaturaMaxFiltro(e.target.value)}
              placeholder="Ej. 5"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 w-44"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              DNI beneficiario
            </label>

            <input
              type="text"
              value={dniBeneficiarioFiltro}
              onChange={e => setDniBeneficiarioFiltro(e.target.value)}
              placeholder="Buscar DNI beneficiario"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              DNI operador
            </label>

            <input
              type="text"
              value={dniOperadorFiltro}
              onChange={e => setDniOperadorFiltro(e.target.value)}
              placeholder="Buscar DNI operador"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600"
            />
          </div>

          <button
            onClick={() => {
              setFechaDesdeFiltro('')
              setFechaHastaFiltro('')
              setTemperaturaMinFiltro('')
              setTemperaturaMaxFiltro('')
              setDniBeneficiarioFiltro('')
              setDniOperadorFiltro('')
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

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
              <div className="flex items-end gap-3 h-52 overflow-x-auto pb-6 pt-8">
                {kitsPorFecha.map(([fecha, total]) => (
                  <div
                    key={fecha}
                    className="flex flex-col items-center min-w-14"
                  >
                    <div className="text-slate-300 text-xs mb-1">
                      {total}
                    </div>

                    <div
                      className="w-9 bg-cyan-500 rounded-t"
                      style={{
                        height: `${(total / maxFecha) * 120}px`,
                      }}
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
              <div className="flex items-end gap-3 h-52 overflow-x-auto pb-6 pt-8">
                {entregasAcumuladas.map(([fecha, total]) => (
                  <div
                    key={fecha}
                    className="flex flex-col items-center min-w-14"
                  >
                    <div className="text-slate-300 text-xs mb-1">
                      {total}
                    </div>

                    <div
                      className="w-9 bg-emerald-500 rounded-t"
                      style={{
                        height: `${(total / maxAcumulado) * 120}px`,
                      }}
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
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosGenero}
                      dataKey="total"
                      nameKey="genero"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name ?? ''} ${(
                          ((percent ?? 0) as number) * 100
                        ).toFixed(0)}%`
                      }
                    >
                      {datosGenero.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            coloresGenero[
                              index % coloresGenero.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip />

                    <Legend
                      wrapperStyle={{
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 border-b border-slate-700 p-4 flex-shrink-0">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-white text-sm font-semibold">
                Detalle de entregas
              </h2>

              <p className="text-slate-400 text-xs">
                Registros provenientes del formulario Kit Frío
              </p>
            </div>

            <button
              onClick={descargarKitFrioCsv}
              disabled={entregasFiltradas.length === 0}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-3 py-2 rounded border border-cyan-500 disabled:border-slate-600 text-sm"
            >
              Descargar CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-40">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-slate-300 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">
                    ID kit
                  </th>

                  <th className="px-4 py-2 text-left">
                    Fecha
                  </th>

                  <th className="px-4 py-2 text-left">
                    Temperatura
                  </th>

                  <th className="px-4 py-2 text-left">
                    DNI operador
                  </th>

                  <th className="px-4 py-2 text-left">
                    DNI beneficiario
                  </th>

                  <th className="px-4 py-2 text-left">
                    Nombre y apellido
                  </th>

                  <th className="px-4 py-2 text-left">
                    Género
                  </th>

                  <th className="px-4 py-2 text-left">
                    Edad
                  </th>

                  <th className="px-4 py-2 text-left">
                    Observaciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {entregasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      No hay entregas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  entregasFiltradas.map(e => (
                    <tr
                      key={e.id}
                      className="border-t border-slate-700 hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-300">
                        {e.id_kit ?? e.id}
                      </td>

                      <td className="px-4 py-2 text-white whitespace-nowrap">
                        {formatearFecha(
                          e.submission_time_local ??
                            e.submission_time,
                        )}
                      </td>

                      <td className="px-4 py-2 text-white whitespace-nowrap">
                        {formatearTemperatura(e.temperatura_c)}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {e.operator_id ?? '—'}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {getDniUnificado(e) || '—'}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {e.nombre_apellido ??
                          e.nombre ??
                          '—'}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {e.genero ?? '—'}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {e.edad ?? '—'}
                      </td>

                      <td className="px-4 py-2 text-white">
                        {e.observaciones ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 p-4">
        <div className="mb-2">
          <h2 className="text-white text-sm font-semibold">
            Mapa de puntos de entrega
          </h2>

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