// Field names match Phase 2 exporter output exactly (Phase 2 D-01 through D-05).
// dni_hash is present in the JSON and in this type — but MUST NEVER be rendered
// in any JSX popup or UI element. It is here for type completeness only.
// submission_time is available but omitted from popup in v1 (Phase 3 D-12).

export interface Entrega {
  id: string
  lat: number
  lon: number
  operator_id: string | null
  id_kit: string | null
  nombre_apellido: string | null
  nombre: string | null
  apellido: string | null
  genero: string | null
  edad: number | null
  observaciones: string | null
  dni: string | null
  dni_hash: string
  submission_time: string | null
}
