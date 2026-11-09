import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import i18n from '@/i18n/config'
import { useUnits } from './units'

describe('useUnits', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('writes prices per unit and quantities with singular and plural names', async () => {
    await i18n.changeLanguage('en')
    const { result } = renderHook(() => useUnits())

    expect(result.current.price(120, 'Kg')).toBe('Rs 120/kg')
    expect(result.current.price(450, 'Bunch')).toBe('Rs 450/bunch')
    expect(result.current.quantity(1, 'Bunch')).toBe('1 bunch')
    expect(result.current.quantity(3, 'Bunch')).toBe('3 bunches')
    expect(result.current.quantity(2.5, 'Kg')).toBe('2.5 kg')
    expect(result.current.quantity(12, 'Piece')).toBe('12 pieces')
    expect(result.current.name('Sack')).toBe('Sacks')
  })

  it('treats a missing or unknown unit as kg, as listings were before units existed', async () => {
    await i18n.changeLanguage('en')
    const { result } = renderHook(() => useUnits())

    expect(result.current.price(90, undefined)).toBe('Rs 90/kg')
    expect(result.current.quantity(5, 'Barrel')).toBe('5 kg')
  })

  it('is translated', async () => {
    await i18n.changeLanguage('si')
    const { result } = renderHook(() => useUnits())

    expect(result.current.price(120, 'Kg')).toBe('රු. 120/කි.ග්‍රෑ.')
    expect(result.current.quantity(3, 'Bunch')).toBe('කැන 3')
  })
})
