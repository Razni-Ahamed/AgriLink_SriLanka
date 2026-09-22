import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { PASSWORD_RULES } from '@/lib/passwordSchema'

interface PasswordChecklistProps {
  password: string
  id?: string
}

type RowState = 'neutral' | 'met' | 'unmet'

/**
 * Live-updating password requirements list. Every rule starts neutral (not red) before the user
 * has typed anything — red before the first keystroke would read as an error on an empty field,
 * which isn't one yet. Colour is never the only signal: each row also names its state in text for
 * screen readers, since colour alone can't carry that information.
 */
export function PasswordChecklist({ password, id }: PasswordChecklistProps) {
  const { t } = useTranslation('common')
  const generatedId = useId()
  const listId = id ?? generatedId
  const hasValue = password.length > 0

  return (
    <ul id={listId} aria-label={t('passwordChecklist.ariaLabel')} className="flex flex-col gap-1 text-sm">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        const state: RowState = !hasValue ? 'neutral' : met ? 'met' : 'unmet'
        const stateLabel =
          state === 'met'
            ? t('passwordChecklist.met')
            : state === 'unmet'
              ? t('passwordChecklist.notMet')
              : t('passwordChecklist.notChecked')

        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 transition-colors duration-150 motion-reduce:transition-none',
              state === 'met' && 'text-state-success',
              state === 'unmet' && 'text-state-danger',
              state === 'neutral' && 'text-text-secondary',
            )}
          >
            {state === 'met' ? (
              <CheckCircle size={16} weight="fill" aria-hidden="true" className="shrink-0" />
            ) : (
              <XCircle
                size={16}
                weight={state === 'unmet' ? 'fill' : 'regular'}
                aria-hidden="true"
                className="shrink-0"
              />
            )}
            <span>{t(rule.labelKey)}</span>
            <span className="sr-only"> ({stateLabel})</span>
          </li>
        )
      })}
    </ul>
  )
}
