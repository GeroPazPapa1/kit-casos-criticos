// Header strip — displays total kits and last-updated timestamp.
// D-10: no title, no logo. D-11: timestamp formatted as DD/MM/YYYY HH:mm.
// flex-shrink-0 prevents header from collapsing when map requests full height.
// flex-wrap prevents horizontal overflow at 375px — two stats stack to two lines.

interface HeaderProps {
  total: number
  timestamp: string  // ISO 8601 string with -03:00 offset
}

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export const Header = ({ total, timestamp }: HeaderProps) => (
  <header className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 flex-shrink-0">
    <span className="text-white text-sm font-semibold">{total} kits entregados</span>
    <span className="text-slate-400 text-sm">
      Actualizado:{' '}
      <span className="text-white font-semibold">{formatTimestamp(timestamp)}</span>
    </span>
  </header>
)
