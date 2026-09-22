import { isAxiosError } from 'axios'

type Translate = (key: string, options?: Record<string, unknown>) => string

export interface ParsedApiError {
  /** This form's field name mapped to a message to show under it. */
  fieldErrors: Record<string, string>
  /** Messages that don't map to a specific field — show these in a general alert box. */
  generalErrors: string[]
}

export interface ParseApiErrorOptions {
  /** Translation key for the last-resort fallback, used when no other shape matches. */
  genericErrorKey?: string
  /** Translation key shown when the request never reached the server. */
  networkErrorKey?: string
  /** Translation key for a 409 conflict and for Identity's DuplicateUserName/DuplicateEmail codes. */
  conflictKey?: string
}

const DEFAULT_GENERIC_ERROR_KEY = 'auth:register.error'
const DEFAULT_NETWORK_ERROR_KEY = 'auth:register.networkError'
const DEFAULT_CONFLICT_KEY = 'auth:register.emailExists'

/**
 * Identity's error codes are stable across versions (unlike the English descriptions), so
 * failures from UserManager.CreateAsync are mapped by code to the same wording the password
 * checklist and field validation already use. A code without an entry here falls through to the
 * server's own description text.
 */
const IDENTITY_CODE_MESSAGE_KEYS: Record<string, string> = {
  PasswordTooShort: 'common:validation.passwordMin12',
  PasswordRequiresUpper: 'common:validation.passwordUppercase',
  PasswordRequiresLower: 'common:validation.passwordLowercase',
  PasswordRequiresDigit: 'common:validation.passwordDigit',
  PasswordRequiresNonAlphanumeric: 'common:validation.passwordSymbol',
  InvalidEmail: 'common:validation.emailInvalid',
}

const DUPLICATE_IDENTITY_CODES = new Set(['DuplicateUserName', 'DuplicateEmail'])

/** ASP.NET ValidationProblemDetails field names (from [Required]/[MaxLength]/... on the DTO) mapped to this form's field names. */
const SERVER_FIELD_TO_FORM_FIELD: Record<string, string> = {
  FullName: 'fullName',
  Email: 'email',
  Password: 'password',
  NIC: 'nic',
  District: 'district',
  FieldPlotNumber: 'fieldPlotNumber',
  PhoneNumber: 'phoneNumber',
  BusinessRegistrationNumber: 'businessRegistrationNumber',
  BusinessPhone: 'businessPhone',
  LegalBusinessName: 'legalBusinessName',
}

interface IdentityErrorItem {
  code?: string
  description?: string
}

function isIdentityErrorItem(value: unknown): value is IdentityErrorItem {
  return typeof value === 'object' && value !== null && 'description' in value
}

/**
 * Turns an Axios error from an Identity-backed endpoint (register, admin create-user, ...) into
 * field-level and general messages a form can show. Handles all four shapes the API can return:
 * `{ message }`, `{ errors: [{ code, description }] }`, ASP.NET's ValidationProblemDetails
 * (`{ errors: { Field: [...] } }`), and a network failure (no response at all). The generic
 * fallback message is used only when none of those shapes match.
 */
/**
 * `tArg` accepts i18next's `t` from any component's useTranslation() call. i18next's own
 * TFunction type is branded per the exact namespace tuple that call declared, so a
 * TFunction<['auth','common']> and a TFunction<['orders','common']> aren't interchangeable even
 * though both callers only ever pass fully qualified "ns:key" strings here — and this helper's
 * keys are computed at runtime from server error codes/fields, so they can never be the
 * compile-time literals i18next's types otherwise require of a specific TFunction. Accepting
 * `unknown` and casting once, centrally, avoids both problems without an explicit `any` at the
 * public boundary.
 */
export function parseApiError(error: unknown, tArg: unknown, options: ParseApiErrorOptions = {}): ParsedApiError {
  const t = tArg as Translate
  const genericErrorKey = options.genericErrorKey ?? DEFAULT_GENERIC_ERROR_KEY
  const networkErrorKey = options.networkErrorKey ?? DEFAULT_NETWORK_ERROR_KEY
  const conflictKey = options.conflictKey ?? DEFAULT_CONFLICT_KEY

  const fieldErrors: Record<string, string> = {}
  const generalErrors: string[] = []

  if (!isAxiosError(error)) {
    generalErrors.push(t(genericErrorKey))
    return { fieldErrors, generalErrors }
  }

  if (!error.response) {
    generalErrors.push(t(networkErrorKey))
    return { fieldErrors, generalErrors }
  }

  const { status, data } = error.response

  if (status === 409) {
    generalErrors.push(t(conflictKey))
    return { fieldErrors, generalErrors }
  }

  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>

    if (Array.isArray(body.errors)) {
      for (const item of body.errors) {
        if (isIdentityErrorItem(item)) {
          const messageKey = item.code
            ? (DUPLICATE_IDENTITY_CODES.has(item.code) ? conflictKey : IDENTITY_CODE_MESSAGE_KEYS[item.code])
            : undefined
          generalErrors.push(messageKey ? t(messageKey) : (item.description ?? t(genericErrorKey)))
        } else {
          generalErrors.push(String(item))
        }
      }
      if (generalErrors.length > 0) {
        return { fieldErrors, generalErrors }
      }
    } else if (body.errors && typeof body.errors === 'object') {
      // ValidationProblemDetails: { errors: { "Email": ["..."], "NIC": ["..."] } }
      for (const [serverField, messages] of Object.entries(body.errors as Record<string, unknown>)) {
        const message = Array.isArray(messages) ? String(messages[0]) : String(messages)
        const formField = SERVER_FIELD_TO_FORM_FIELD[serverField]
        if (formField) {
          fieldErrors[formField] = message
        } else {
          generalErrors.push(message)
        }
      }
      if (Object.keys(fieldErrors).length > 0 || generalErrors.length > 0) {
        return { fieldErrors, generalErrors }
      }
    } else if (typeof body.message === 'string') {
      generalErrors.push(body.message)
      return { fieldErrors, generalErrors }
    }
  }

  generalErrors.push(t(genericErrorKey))
  return { fieldErrors, generalErrors }
}
