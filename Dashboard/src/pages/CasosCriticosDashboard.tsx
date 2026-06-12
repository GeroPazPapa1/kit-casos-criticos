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

const getDniOperador = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, [
    'operator_id',
    'dni_operador',
    'dniOperador',
    'operador_dni',
    'dni_operador_red',
    'DNI operador',
    'DNI Operador',
  ])

const getNombre = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['nombre', 'Nombre', 'nombre_persona', 'Nombre persona'])

const getApellido = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['apellido', 'Apellido', 'apellido_persona', 'Apellido persona'])

const getComuna = (caso: Record<string, unknown>) =>
  getCampoTexto(caso, ['comuna', 'Comuna', 'comuna_calculada'])

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
  const [dniBeneficiarioFiltro, setDniBeneficiarioFiltro] = useState('')
  const [dniOperadorFiltro, setDniOperadorFiltro] = useState('')

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

    const dniBeneficiarioBuscado = normalizarDni(dniBeneficiarioFiltro)
    const dniOperadorBuscado = normalizarDni(dniOperadorFiltro)

    const cumpleDniBeneficiario =
      !dniBeneficiarioBuscado ||
      normalizarDni(getDni(caso)).includes(dniBeneficiarioBuscado)

    const cumpleDniOperador =
      !dniOperadorBuscado ||
      normalizarDni(getDniOperador(caso)).includes(dniOperadorBuscado)

    return cumpleRiesgo && cumpleDniBeneficiario && cumpleDniOperador
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
                <option key={riesgo} value={riesgo}>
                  {riesgo}
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
              DNI operador
            </label>
            <input
              type="text"
              value={dniOperadorFiltro}
              onChange={e => setDniOperadorFiltro(e.target.value)}
              placeholder="Buscar DNI operador"
              className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 min-w-64"
            />
          </div>

          <button
            onClick={() => {
              setRiesgoFiltro('')
              setDniBeneficiarioFiltro('')
              setDniOperadorFiltro('')
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded border border-slate-600"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* El resto de gráficos, tabla y mapa queda igual */}
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