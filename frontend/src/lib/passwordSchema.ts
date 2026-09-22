import { z } from 'zod'

export interface PasswordSchemaMessages {
  min: string
  uppercase: string
  lowercase: string
  digit: string
  symbol: string
}

/**
 * Mirrors Identity's password policy configured in the backend's Program.cs (12+ characters,
 * upper, lower, digit, symbol) so a weak password is rejected in the form instead of round-
 * tripping to the API first. The backend is still the source of truth — this only front-loads
 * the same rules, it never replaces the server-side check.
 */
export function buildPasswordSchema(messages: PasswordSchemaMessages) {
  return z
    .string()
    .min(12, messages.min)
    .regex(/[A-Z]/, messages.uppercase)
    .regex(/[a-z]/, messages.lowercase)
    .regex(/[0-9]/, messages.digit)
    .regex(/[^A-Za-z0-9]/, messages.symbol)
}
