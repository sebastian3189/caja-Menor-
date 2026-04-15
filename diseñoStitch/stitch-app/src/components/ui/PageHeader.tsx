import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, icon: Icon, iconColor, iconBg, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 justify-between mb-6', className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
