import { useEffect, useState } from 'react'

const BASE = '/data/dist'

type CasoCritico = Record<string, unknown>

type MetaCasosCriticos = {
  total: number
  timestamp: string
  source: string
}

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ok'; casos: CasoCritico[]; meta: MetaCasosCriticos }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} leyendo ${url}`)
  }

  return response.json()
}

export const useCasosCriticos = (): State => {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchJson<CasoCritico[]>(`${BASE}/casos_criticos.json`),
      fetchJson<MetaCasosCriticos>(`${BASE}/casos_criticos_meta.json`),
    ])
      .then(([casos, meta]) => {
        if (!Array.isArray(casos)) {
          throw new Error('casos_criticos.json no es un array')
        }

        if (!cancelled) {
          setState({ status: 'ok', casos, meta })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', error: String(err) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}