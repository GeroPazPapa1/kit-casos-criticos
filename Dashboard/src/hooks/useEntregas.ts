import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/api'
import type { Entrega } from '@/types/domain'
import type { Meta } from '@/types/meta'

const BASE = '/data/dist'

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ok'; entregas: Entrega[]; meta: Meta }

export const useEntregas = (): State => {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchJson<Entrega[]>(`${BASE}/entregas.json`),
      fetchJson<Meta>(`${BASE}/meta.json`),
    ])
      .then(([entregas, meta]) => {
        if (!Array.isArray(entregas)) throw new Error('entregas.json is not an array')
        if (!cancelled) setState({ status: 'ok', entregas, meta })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: String(err) })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
