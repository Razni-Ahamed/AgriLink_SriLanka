import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES, buildPasswordSchema } from './passwordSchema'

const messages = {
  min: 'min',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  digit: 'digit',
  symbol: 'symbol',
}

describe('PASSWORD_RULES', () => {
  it('length rule passes at and above the minimum, fails below it', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'length')!
    expect(rule.test('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true)
    expect(rule.test('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false)
  })

  it('lowercase rule passes only with a lowercase letter present', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'lowercase')!
    expect(rule.test('abc')).toBe(true)
    expect(rule.test('ABC123!@#')).toBe(false)
  })

  it('uppercase rule passes only with an uppercase letter present', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'uppercase')!
    expect(rule.test('ABC')).toBe(true)
    expect(rule.test('abc123!@#')).toBe(false)
  })

  it('digit rule passes only with a digit present', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'digit')!
    expect(rule.test('abc123')).toBe(true)
    expect(rule.test('abcDEF!@#')).toBe(false)
  })

  it('symbol rule passes only with a non-alphanumeric character present', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'symbol')!
    expect(rule.test('abc!')).toBe(true)
    expect(rule.test('abcDEF123')).toBe(false)
  })
})

describe('buildPasswordSchema', () => {
  const schema = buildPasswordSchema(messages)

  it('accepts a password that satisfies every rule', () => {
    expect(schema.safeParse('Password@123!').success).toBe(true)
  })

  it('rejects a password and agrees with PASSWORD_RULES about which rules failed', () => {
    const candidates = ['short', 'nouppercase123!', 'NOLOWERCASE123!', 'NoDigitsHere!', 'NoSymbolHere123', '']

    for (const candidate of candidates) {
      const schemaResult = schema.safeParse(candidate)
      const rulesAgree = PASSWORD_RULES.every((rule) => rule.test(candidate))
      expect(schemaResult.success).toBe(rulesAgree)
    }
  })

  it('reports the first failing rule, in PASSWORD_RULES order', () => {
    const result = schema.safeParse('short')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(messages.min)
    }
  })
})
