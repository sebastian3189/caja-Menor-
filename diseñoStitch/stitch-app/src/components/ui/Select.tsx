import { cn } from '@/lib/utils'
import { forwardRef, type SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900',
          'appearance-none cursor-pointer transition-all duration-150 outline-none',
          'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400',
          'hover:border-slate-300',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'
