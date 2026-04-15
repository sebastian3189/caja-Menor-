import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400',
          'bg-white transition-all duration-150 outline-none',
          'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
            : 'border-slate-200 hover:border-slate-300',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
