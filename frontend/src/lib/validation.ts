/**
 * NIC and phone rules shared across forms that collect them (currently registration; other forms
 * can import these instead of redefining the patterns). Mirrors the same rules enforced
 * server-side in AuthController.
 */

/** New NIC format: 12 digits, no letter. */
export const NIC_NEW_FORMAT_REGEX = /^\d{12}$/

/** Old NIC format: 9 digits followed by V or X (case accepted, but the stored value is upper). */
export const NIC_OLD_FORMAT_REGEX = /^\d{9}[VvXx]$/

/** Sri Lankan local phone numbers: exactly 10 digits, no leading country code. */
export const PHONE_REGEX = /^\d{10}$/

export function isValidNic(nic: string): boolean {
  const trimmed = nic.trim()
  return NIC_NEW_FORMAT_REGEX.test(trimmed) || NIC_OLD_FORMAT_REGEX.test(trimmed)
}

/** Trims surrounding whitespace and uppercases a trailing V/X. Does not validate the format. */
export function normalizeNic(nic: string): string {
  const trimmed = nic.trim()
  return NIC_OLD_FORMAT_REGEX.test(trimmed) ? trimmed.slice(0, 9) + trimmed.slice(9).toUpperCase() : trimmed
}

/** Strips spaces and dashes so "077 123 4567" and "077-123-4567" both become "0771234567". */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '')
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(normalizePhone(phone))
}

/**
 * Username rules, mirroring backend Services/Accounts/UsernamePolicy.cs. The server re-checks every
 * one of these; this copy only lets a form flag a bad username before a round trip.
 */
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

/** Lowercase letters, digits, `.` and `_`, starting and ending with a letter or digit. */
export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'agrilink',
  'support',
  'system',
  'root',
  'officer',
  'farmer',
  'buyer',
  'null',
  'undefined',
  'me',
  'api',
  'help',
])

export type UsernameProblem = 'tooShort' | 'tooLong' | 'invalid' | 'reserved'

/** Trims and lowercases, the same normalisation the server applies before checking. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

/** What is wrong with an already-normalised username, or null when it passes every rule. */
export function usernameProblem(normalized: string): UsernameProblem | null {
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return 'tooShort'
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return 'tooLong'
  }
  if (!USERNAME_REGEX.test(normalized) || normalized.includes('..')) {
    return 'invalid'
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return 'reserved'
  }
  return null
}

/** Mirrors the display-name column length on the server (ProfileFieldLimits.DisplayName). */
export const DISPLAY_NAME_MAX_LENGTH = 60
export const FIELD_PLOT_NUMBER_MAX_LENGTH = 50
export const BUSINESS_NAME_MAX_LENGTH = 100
