import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label && <span className="font-medium text-text-primary">{label}</span>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'rounded-[14px] border border-text-primary/15 bg-bg-surface px-3.5 py-2.5 text-text-primary outline-none transition-[border-color,box-shadow] focus:border-brand-forest focus:ring-4 focus:ring-brand-forest/15',
            error && 'border-state-danger',
            className,
          )}
          {...props}
        />
        {error && <span className="text-state-danger">{error}</span>}
      </label>
    )
  },
)
Input.displayName = 'Input'
