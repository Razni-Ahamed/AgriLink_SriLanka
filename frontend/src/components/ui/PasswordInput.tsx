import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

/**
 * A password Input with a show/hide toggle. The toggle only swaps the input's `type` between
 * `password` and `text` — it never touches the value, so what the user typed is unaffected.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const { t } = useTranslation('common')
    const [visible, setVisible] = useState(false)

    return (
      <label className="flex flex-col gap-1 text-sm">
        {label && <span className="font-medium text-text-primary">{label}</span>}
        <span className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            className={cn(
              'w-full rounded-xl border border-text-secondary/25 bg-bg-canvas px-3 py-2 pr-10 text-text-primary outline-none focus:border-brand-forest',
              error && 'border-state-danger',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? t('actions.hidePassword') : t('actions.showPassword')}
            className="absolute right-2 text-text-secondary hover:text-text-primary"
          >
            {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </span>
        {error && <span className="text-state-danger">{error}</span>}
      </label>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
