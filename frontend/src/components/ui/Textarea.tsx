import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label && <span className="font-medium text-text-primary">{label}</span>}
        <textarea
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
Textarea.displayName = 'Textarea'
