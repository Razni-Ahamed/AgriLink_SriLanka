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
Textarea.displayName = 'Textarea'
