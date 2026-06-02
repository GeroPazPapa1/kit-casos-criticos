// Matches Phase 2 exporter meta.json output (Phase 2 D-06, D-07, D-08).
// timestamp: ISO 8601 string with -03:00 offset (Argentina time).
// total: integer count of delivery records in the corresponding entregas.json.

export interface Meta {
  timestamp: string  // e.g. "2026-06-01T14:30:00-03:00"
  total: number
}
