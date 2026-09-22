import { describe, expect, it } from 'vitest'
import { isValidNic, isValidPhone, normalizeNic, normalizePhone } from './validation'

describe('NIC', () => {
  it.each([
    ['200012345678', true],
    ['901234567V', true],
    ['901234567x', true],
    ['90123456V', false], // only 8 digits before the letter
    ['1234567890', false], // 10 digits, neither format
    ['20001234567A', false], // 12 digits followed by a letter
  ])('%s -> valid=%s', (nic, expected) => {
    expect(isValidNic(nic)).toBe(expected)
  })

  it('normalizes a lowercase trailing letter to uppercase', () => {
    expect(normalizeNic('901234567x')).toBe('901234567X')
    expect(normalizeNic('901234567V')).toBe('901234567V')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeNic('  901234567v  ')).toBe('901234567V')
  })

  it('leaves the new 12-digit format unchanged', () => {
    expect(normalizeNic('200012345678')).toBe('200012345678')
  })
})

describe('phone', () => {
  it.each([
    ['0771234567', true],
    ['077 123 4567', true],
    ['077123456', false], // 9 digits
    ['07712345678', false], // 11 digits
    ['07712a4567', false], // contains a letter
  ])('%s -> valid=%s', (phone, expected) => {
    expect(isValidPhone(phone)).toBe(expected)
  })

  it('strips spaces and dashes', () => {
    expect(normalizePhone('077 123 4567')).toBe('0771234567')
    expect(normalizePhone('077-123-4567')).toBe('0771234567')
  })
})
