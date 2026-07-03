import { useState } from 'react'

export interface StackedSegment {
  label: string
  value: number
  /** Color de la marca (fill). El texto usa tokens de tinta, nunca este color. */
  color: string
}

interface StackedBarProps {
  segments: StackedSegment[]
  formatValue?: (v: number) => string
  /** Alto de la barra en px. */
  height?: number
  /** Mostrar leyenda debajo (siempre para ≥2 series). */
  legend?: boolean
}

/**
 * Barra apilada horizontal para relaciones parte-a-todo.
 * - separador de 2px en color de superficie entre segmentos
 * - extremos exteriores redondeados (4px), interiores separados por el gap
 * - leyenda con swatch + etiqueta + valor (el texto nunca lleva el color de serie)
 * - tooltip por segmento al hover
 */
export function StackedBar({ segments, formatValue = String, height = 28, legend = true }: StackedBarProps) {
  const [hover, setHover] = useState<number | null>(null)
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const safeTotal = total > 0 ? total : 1

  return (
    <div className="w-full">
      {/* Barra */}
      <div
        className="relative w-full flex rounded-lg overflow-hidden bg-slate-100"
        style={{ height, gap: 2 }}
        role="img"
        aria-label={segments.map(s => `${s.label}: ${formatValue(s.value)}`).join(', ')}
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / safeTotal) * 100
          if (pct <= 0) return null
          return (
            <div
              key={i}
              className="relative h-full transition-opacity first:rounded-l-lg last:rounded-r-lg"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs shadow-lg pointer-events-none">
                  <span className="font-medium">{seg.label}</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="font-semibold tabular-nums">{formatValue(seg.value)}</span>
                  <span className="ml-1.5 text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      {legend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
          {segments.map((seg, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center gap-1.5 group"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-slate-500 group-hover:text-slate-700">{seg.label}</span>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatValue(seg.value)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
