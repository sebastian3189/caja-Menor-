import { cn } from '@/lib/utils'

interface StatusCircleProps {
  estado: 'SinReembolso' | 'EnProceso' | 'Reembolsado'
  size?: 'sm' | 'md'
}

export function StatusCircle({ estado, size = 'md' }: StatusCircleProps) {
  const colorMap = {
    SinReembolso: 'bg-yellow-400',
    EnProceso: 'bg-blue-400',
    Reembolsado: 'bg-green-500',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        colorMap[estado],
        size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
      )}
      title={estado}
    />
  )
}
