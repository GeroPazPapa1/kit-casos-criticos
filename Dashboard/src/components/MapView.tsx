// Stub — will be replaced in Task 3
import type { Entrega } from '@/types/domain'

interface MapViewProps {
  entregas: Entrega[]
}

export const MapView = ({ entregas: _ }: MapViewProps) => (
  <div className="flex-1 min-h-0 bg-slate-800" />
)
