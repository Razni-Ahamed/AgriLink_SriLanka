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
            'rounded-[14px] border border-text-primary/15 bg-bg-surface px-3.5 py-2.5 text-text-primary outline-none transition-[border-color,box-shadow] focus:border-brand-forest focus:ring-4 focus:ring-brand-forest/15',
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
