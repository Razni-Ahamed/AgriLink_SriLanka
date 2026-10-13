import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import i18n from '@/i18n/config'
import { REVIEW_OVERDUE_HOURS, hoursSince, isOverdue, splitWait, useFormatWait } from './reviewTiming'

const now = Date.parse('2026-10-13T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString()

describe('reviewTiming', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('is overdue only after the same 48 hours the backend uses', () => {
    expect(REVIEW_OVERDUE_HOURS).toBe(48)
    expect(isOverdue(hoursAgo(47.9), now)).toBe(false)
    expect(isOverdue(hoursAgo(48), now)).toBe(false)
    expect(isOverdue(hoursAgo(48.1), now)).toBe(true)
  })

  it('never reports a negative wait for a clock that is slightly ahead', () => {
    expect(hoursSince(hoursAgo(-1), now)).toBe(0)
  })

  it('splits a wait into whole days and hours, rounding down', () => {
    expect(splitWait(5.9)).toEqual({ days: 0, hours: 5 })
    expect(splitWait(24)).toEqual({ days: 1, hours: 0 })
    expect(splitWait(52.5)).toEqual({ days: 2, hours: 4 })
  })

  it('formats a wait in the current language', async () => {
    const { result, rerender } = renderHook(() => useFormatWait())
    expect(result.current(5.9)).toBe('5 h')
    expect(result.current(52.5)).toBe('2 d 4 h')

    await act(() => i18n.changeLanguage('si'))
    rerender()
    expect(result.current(52)).toBe('දින 2 පැය 4')

    await act(() => i18n.changeLanguage('ta'))
    rerender()
    expect(result.current(5)).toBe('5 மணி')
  })
})
