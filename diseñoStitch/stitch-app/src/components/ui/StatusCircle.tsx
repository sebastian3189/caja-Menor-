import { cn } from '@/lib/utils'

type Estado = 'SinReembolso' | 'EnProceso' | 'Reembolsado' | 'Pendiente' | 'Legalizado'

interface StatusCircleProps {
  estado: Estado
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

const colorMap: Record<Estado, string> = {
  SinReembolso: 'bg-amber-400',
  Pendiente: 'bg-amber-400',
  EnProceso: 'bg-blue-400',
  Reembolsado: 'bg-emerald-400',
  Legalizado: 'bg-emerald-400',
}

const sizeMap: Record<NonNullable<StatusCircleProps['size']>, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

export function StatusCircle({ estado, size = 'sm', pulse = false }: StatusCircleProps) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {pulse && estado !== 'Reembolsado' && estado !== 'Legalizado' && (
        <span
          className={cn(
            'absolute inline-flex rounded-full opacity-75 animate-ping',
            colorMap[estado],
            sizeMap[size]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          colorMap[estado],
          sizeMap[size]
        )}
      />
    </span>
  )
}
