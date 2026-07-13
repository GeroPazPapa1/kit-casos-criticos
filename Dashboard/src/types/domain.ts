// Field names match exporter output exactly.
// dni_hash is present in the JSON and in this type — but MUST NEVER be rendered
// in any JSX popup or UI element. It is here for type completeness only.

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
  dni_unificado: string | null
  dni_hash: string
  submission_time: string | null
  submission_time_local: string | null
  temperatura_c: number | null
}