import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
  accent?: 'indigo' | 'amber' | 'emerald' | 'blue' | 'violet' | 'rose' | 'teal' | 'none'
}

const accentMap: Record<NonNullable<CardProps['accent']>, string> = {
  indigo: 'border-t-2 border-t-indigo-500',
  amber: 'border-t-2 border-t-amber-500',
  emerald: 'border-t-2 border-t-emerald-500',
  blue: 'border-t-2 border-t-blue-500',
  violet: 'border-t-2 border-t-violet-500',
  rose: 'border-t-2 border-t-rose-500',
  teal: 'border-t-2 border-t-teal-500',
  none: '',
}

export function Card({ className, children, accent = 'none' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-shadow hover:shadow-md',
        accentMap[accent],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-5 py-4 border-b border-slate-100', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-900', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  )
}
