import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

/** Control de paginación cliente: rango mostrado, prev/next y selector de tamaño. */
export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const desde = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>
          Mostrando <b className="text-slate-700 tabular-nums">{desde}–{hasta}</b> de{' '}
          <b className="text-slate-700 tabular-nums">{totalItems}</b>
        </span>
        <span className="text-slate-300">·</span>
        <label className="flex items-center gap-1.5">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-1.5 py-1 bg-white text-slate-700 focus:outline-none focus:border-teal-400"
          >
            {pageSizeOptions.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs text-slate-600 px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
