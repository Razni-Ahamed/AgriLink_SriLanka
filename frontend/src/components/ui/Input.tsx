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
            'rounded-xl border border-text-secondary/25 bg-bg-canvas px-3 py-2 text-text-primary outline-none focus:border-brand-forest',
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
