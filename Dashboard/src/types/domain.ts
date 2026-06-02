// Field names match Phase 2 exporter output exactly (Phase 2 D-01 through D-05).
// dni_hash is present in the JSON and in this type — but MUST NEVER be rendered
// in any JSX popup or UI element. It is here for type completeness only.
// submission_time is available but omitted from popup in v1 (Phase 3 D-12).

export interface Entrega {
  id: string              // kobo_id renamed per Phase 2 D-02
  lat: number
  lon: number
  nombre: string | null
  apellido: string | null
  genero: string | null
  edad: number | null
  observaciones: string | null
  dni_hash: string        // Phase 2 D-03 — always hashed, NEVER render in UI
  submission_time: string | null  // Phase 2 D-04 — omitted from popup in v1
}
