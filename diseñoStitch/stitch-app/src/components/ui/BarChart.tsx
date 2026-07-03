import { useState } from 'react'

export interface BarDatum {
  label: string
  value: number
  /** Conteo opcional mostrado en el tooltip (ej. "3 movimientos"). */
  count?: number
}

interface BarChartProps {
  data: BarDatum[]
  formatValue?: (v: number) => string
  /** Hue único (magnitud → secuencial de un solo hue). */
  color?: string
  /** Ordenar descendente por valor. */
  sort?: boolean
}

/**
 * Barra horizontal para comparar magnitud entre categorías.
 * - un solo hue (la identidad la lleva la etiqueta del eje, no el color)
 * - barras ≤ altura de banda, extremo derecho redondeado 4px, crecen desde una línea base
 * - valor directo en la punta; tooltip por barra al hover
 * - eje base hairline recesivo
 */
export function BarChart({ data, formatValue = String, color = '#0d9488', sort = true }: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const rows = sort ? [...data].sort((a, b) => b.value - a.value) : data
  const max = Math.max(...rows.map(d => d.value), 1)

  return (
    <div className="w-full space-y-2.5">
      {rows.map((d, i) => {
        const pct = (d.value / max) * 100
        const active = hover === i
        return (
          <div
            key={d.label}
            className="grid grid-cols-[minmax(110px,1.3fr)_2.4fr_auto] items-center gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {/* Etiqueta de categoría (tinta, no color de serie) */}
            <span className={`text-xs text-right truncate transition-colors ${active ? 'text-slate-900 font-medium' : 'text-slate-500'}`} title={d.label}>
              {d.label}
            </span>

            {/* Track + barra */}
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-y-0 left-0 right-0 rounded-md bg-slate-50" />
              <div
                className="relative h-4 rounded-r-md rounded-l-[2px] transition-all duration-500"
                style={{
                  width: `${Math.max(pct, d.value > 0 ? 3 : 0)}%`,
                  backgroundColor: color,
                  opacity: hover === null || active ? 1 : 0.5,
                }}
              />
              {active && d.count !== undefined && (
                <div className="absolute left-0 -top-7 z-10 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs shadow-lg pointer-events-none">
                  <span className="font-medium">{d.label}</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span className="tabular-nums">{d.count} mov.</span>
                </div>
              )}
            </div>

            {/* Valor en columna propia (nunca se recorta) */}
            <span className={`text-xs tabular-nums whitespace-nowrap text-right min-w-[54px] transition-colors ${active ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>
              {formatValue(d.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
