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
