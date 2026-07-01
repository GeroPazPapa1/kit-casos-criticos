import { useState } from 'react'
import { useCasosCriticos } from '@/hooks/useCasosCriticos'
import { MapView } from '@/components/MapView'

const opcionesRiesgo = [
  { value: 'verde_sin_pph', label: 'Código Verde sin PPH' },
  { value: 'verde_con_pph', label: 'Código Verde con PPH' },
  { value: 'amarillo', label: 'Código Amarillo' },
  { value: 'rojo', label: 'Código Rojo' },
]

const opcionesTipoDerivacion = [
  { value: 'espontanea', label: 'Espontánea' },
  { value: 'derivado_por_red', label: 'Pedido 108 / derivado por red' },
  { value: 'derivado_por_red espontanea', label: 'Derivado por red + espontánea' },
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

const getTipoDerivacion = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'Tipo_de_derivaci_n',
    'tipo_derivacion',
    'Tipo de derivación',
  ])

const getDni = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['dni', 'DNI', 'documento', 'Documento'])

const getOperadorBrigadista = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['operador_red', 'nombre_brigadista'])

const getNombre = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['nombre', 'Nombre', 'nombre_persona', 'Nombre persona'])

const getApellido = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['apellido', 'Apellido', 'apellido_persona', 'Apellido persona'])

const getComuna = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['comuna', 'Comuna', 'comuna_calculada'])

const getFecha = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['_submission_time', 'submission_time', 'fecha', 'Fecha'])

const getSame = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'derivo_same',
    'same',
    'SAME',
    'derivacion_same',
    'Derivación SAME',
  ])

const getHospital = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'traslado_hospital',
    'hospital',
    'traslado_hospitalario',
    'Traslado hospitalario',
  ])

const getSeguimiento = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'necesario_seguimiento',
    'seguimiento_caso',
    'seguimiento',
    'requiere_seguimiento',
    'Requiere seguimiento',
  ])

const getDireccion = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['direccion', 'dirección', 'Direccion', 'Dirección'])

const getConsumo = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['consumo_activo', 'consumo_problematico', 'Consumo activo'])

const getCis = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['quiere_cis', 'desea_ingresar_cis', 'cis', 'Desea ingresar a CIS'])

const esSi = (valor: string) => {
  const v = normalizar(valor)
  return v === 'si' || v === 'sí' || v === 'true' || v === '1'
}

const mostrar = (valor: string) => valor || '—'

const formatearRiesgo = (valor: string) =>
  opcionesRiesgo.find(opcion => opcion.value === valor)?.label || valor || '—'

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

export function CasosCriticosDashboard() {
  const state = useCasosCriticos()
  const [riesgoFiltro, setRiesgoFiltro] = useState('')
  const [tipoDerivacionFiltro, setTipoDerivacionFiltro] = useState('')
  const [dniBeneficiarioFiltro, setDniBeneficiarioFiltro] = useState('')
  const [operadorBrigadistaFiltro, setOperadorBrigadistaFiltro] = useState('')

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

    const cumpleTipoDerivacion =
      !tipoDerivacionFiltro || getTipoDerivacion(caso) === tipoDerivacionFiltro

    const dniBeneficiarioBuscado = normalizarDni(dniBeneficiarioFiltro)

    const cumpleDniBeneficiario =
      !dniBeneficiarioBuscado ||
      normalizarDni(getDni(caso)).includes(dniBeneficiarioBuscado)

    const operadorBrigadistaBuscado = normalizar(operadorBrigadistaFiltro)

    const cumpleOperadorBrigadista =
      !operadorBrigadistaBuscado ||
      normalizar(getOperadorBrigadista(caso)).includes(operadorBrigadistaBuscado)

    return (
      cumpleRiesgo &&
      cumpleTipoDerivacion &&
      cumpleDniBeneficiario &&
      cumpleOperadorBrigadista
    )
  })

  const personasUnicas = new Set(
    casosFiltrados.map(caso => normalizarDni(getDni(caso))).filter(Boolean),
  ).size

  const casosCriticos = casosFiltrados.filter(caso => {
    const riesgo = getRiesgoSanitario(caso)
    return riesgo === 'rojo'
  }).length

  const casosSame = casosFiltrados.filter(caso => esSi(getSame(caso))).length
  const trasladosHospital = casosFiltrados.filter(caso => esSi(getHospital(caso))).length

  const casosSeguimiento = casosFiltrados.filter(caso => {
    const seguimiento = normalizar(getSeguimiento(caso))
    return seguimiento !== '' && seguimiento !== 'no' && seguimiento !== 'false' && seguimiento !== '0'
  }).length

  const descargarCasosCsv = () => {
    descargarCsv(
      'casos_criticos.csv',
      [
        'Fecha',
        'Operador / Brigadista',
        'DNI beneficiario',
        'Nombre',
        'Apellido',
        'Riesgo sanitario',
        'Tipo de derivación',
        'Comuna',
        'Dirección',
        'Consumo activo',
        'Desea ingresar a CIS',
        'SAME',
        'Traslado hospitalario',
        'Seguimiento',
      ],
      casosFiltrados.map(caso => [
        getFecha(caso),
        getOperadorBrigadista(caso),
        getDni(caso),
        getNombre(caso),
        getApellido(caso),
        formatearRiesgo(getRiesgoSanitario(caso)),
        getTipoDerivacion(caso),
        getComuna(caso),
        getDireccion(caso),
        getConsumo(caso),
        getCis(caso),
        getSame(caso),
        getHospital(caso),
        getSeguimiento(caso),
      ]),
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
        <h1 className="text-sm font-semibold">Casos Críticos Sanitarios</h1>
        <p className="text-xs text-slate-400">
          Total de registros:{' '}
          <span className="text-white font-semibold">{meta.total}</span>
        </p>
      </header>

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
                <option key={riesgo.value} value={riesgo.value}>
                  {riesgo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Tipo de derivación
            </label>
            <select
              value={tipoDerivacionFiltro}
              onChange={e => setTipoDerivacionFiltro(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-64"
            >
              <option value="">Todos los tipos</option>
              {opcionesTipoDerivacion.map(tipo => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
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
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-64"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase mb-1">
              Operador / Brigadista
            </label>
            <input
              type="text"
              value={operadorBrigadistaFiltro}
              onChange={e => setOperadorBrigadistaFiltro(e.target.value)}
              placeholder="Buscar operador o brigadista"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-64"
            />
          </div>

          <button
            onClick={() => {
              setRiesgoFiltro('')
              setTipoDerivacionFiltro('')
              setDniBeneficiarioFiltro('')
              setOperadorBrigadistaFiltro('')
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      <section className="p-4 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-white text-sm font-semibold">
                Detalle de intervenciones
              </h2>
              <p className="text-slate-400 text-xs">
                Registros filtrados del formulario de casos críticos sanitarios.
              </p>
            </div>

            <button
              onClick={descargarCasosCsv}
              disabled={casosFiltrados.length === 0}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-3 py-2 rounded border border-cyan-500 disabled:border-slate-600 text-sm"
            >
              Descargar CSV
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-slate-300 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Operador / Brigadista</th>
                  <th className="px-4 py-2 text-left">DNI beneficiario</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Apellido</th>
                  <th className="px-4 py-2 text-left">Riesgo</th>
                  <th className="px-4 py-2 text-left">Tipo derivación</th>
                  <th className="px-4 py-2 text-left">Comuna</th>
                  <th className="px-4 py-2 text-left">Dirección</th>
                  <th className="px-4 py-2 text-left">Consumo activo</th>
                  <th className="px-4 py-2 text-left">CIS</th>
                  <th className="px-4 py-2 text-left">SAME</th>
                  <th className="px-4 py-2 text-left">Hospital</th>
                  <th className="px-4 py-2 text-left">Seguimiento</th>
                </tr>
              </thead>

              <tbody>
                {casosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      No hay intervenciones para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  casosFiltrados.map((caso, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-700 hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-2 text-white whitespace-nowrap">
                        {mostrar(getFecha(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getOperadorBrigadista(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getDni(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getNombre(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getApellido(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {formatearRiesgo(getRiesgoSanitario(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getTipoDerivacion(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getComuna(caso))}
                      </td>
                      <td className="px-4 py-2 text-white min-w-48">
                        {mostrar(getDireccion(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getConsumo(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getCis(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getSame(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getHospital(caso))}
                      </td>
                      <td className="px-4 py-2 text-white">
                        {mostrar(getSeguimiento(caso))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="p-4 bg-slate-900">
        <div className="mb-2">
          <h2 className="text-white text-sm font-semibold">Mapa de casos críticos</h2>
          <p className="text-slate-400 text-xs">
            Los puntos aparecerán cuando el ETL transforme las coordenadas del formulario a latitud y longitud.
          </p>
        </div>

        <MapView
          entregas={casosFiltrados as any}
          className="h-[600px] flex-shrink-0 rounded-lg overflow-hidden border border-slate-700"
        />
      </section>
    </div>
  )
}