import { cn } from '@/lib/utils'
import type { LabelHTMLAttributes } from 'react'

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-semibold text-slate-600 uppercase tracking-wide', className)}
      {...props}
    >
      {children}
    </label>
  )
}
