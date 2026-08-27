import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, id, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label && <span className="font-medium text-text-primary">{label}</span>}
        <select
          ref={ref}
          id={id}
          className={cn(
            'rounded-xl border border-text-secondary/25 bg-bg-canvas px-3 py-2 text-text-primary outline-none focus:border-brand-forest',
            error && 'border-state-danger',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-state-danger">{error}</span>}
      </label>
    )
  },
)
Select.displayName = 'Select'
