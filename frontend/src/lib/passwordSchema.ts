import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 12

export interface PasswordSchemaMessages {
  min: string
  uppercase: string
  lowercase: string
  digit: string
  symbol: string
}

export type PasswordChecklistLabelKey =
  | 'passwordChecklist.length'
  | 'passwordChecklist.lowercase'
  | 'passwordChecklist.uppercase'
  | 'passwordChecklist.digit'
  | 'passwordChecklist.symbol'

export interface PasswordRule {
  id: 'length' | 'lowercase' | 'uppercase' | 'digit' | 'symbol'
  /** i18n key for the row label shown in PasswordChecklist. */
  labelKey: PasswordChecklistLabelKey
  /** Which PasswordSchemaMessages key this rule's zod error uses when it fails. */
  messageKey: keyof PasswordSchemaMessages
  test: (password: string) => boolean
}

/**
 * The password policy's single source of truth. PasswordChecklist renders one row per rule and
 * buildPasswordSchema validates against the same rules, so the live checklist and the submit-time
 * validation can never disagree about what "valid" means.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    labelKey: 'passwordChecklist.length',
    messageKey: 'min',
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'lowercase',
    labelKey: 'passwordChecklist.lowercase',
    messageKey: 'lowercase',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    labelKey: 'passwordChecklist.uppercase',
    messageKey: 'uppercase',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'digit',
    labelKey: 'passwordChecklist.digit',
    messageKey: 'digit',
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: 'symbol',
    labelKey: 'passwordChecklist.symbol',
    messageKey: 'symbol',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
]

/**
 * Mirrors Identity's password policy configured in the backend's Program.cs (12+ characters,
 * upper, lower, digit, symbol) so a weak password is rejected in the form instead of round-
 * tripping to the API first. The backend is still the source of truth — this only front-loads
 * the same rules, it never replaces the server-side check. Built from PASSWORD_RULES, in rule
 * order, so the first failing rule is the message shown — same behaviour as the old chained
 * `.min().regex()...` version this replaced.
 */
export function buildPasswordSchema(messages: PasswordSchemaMessages) {
  return z.string().superRefine((password, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(password)) {
        ctx.addIssue({ code: 'custom', message: messages[rule.messageKey] })
      }
    }
  })
}
