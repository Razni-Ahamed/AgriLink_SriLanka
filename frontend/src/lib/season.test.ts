import { describe, expect, it } from 'vitest'
import { seasonProgress } from './season'

describe('seasonProgress', () => {
  it('counts the planting day as day 1 and works out what is left', () => {
    const progress = seasonProgress('2026-09-01', '2026-12-10', new Date(2026, 10, 15))
    expect(progress.total).toBe(100)
    expect(progress.day).toBe(76)
    expect(progress.daysLeft).toBe(25)
    expect(progress.fraction).toBeCloseTo(0.75)
  })

  it('stops at the last day once the harvest date has passed', () => {
    const progress = seasonProgress('2026-06-01', '2026-09-01', new Date(2026, 10, 15))
    expect(progress.day).toBe(progress.total)
    expect(progress.fraction).toBe(1)
    expect(progress.daysLeft).toBeLessThan(0)
  })

  it('reads as not started before the planting date', () => {
    const progress = seasonProgress('2026-12-01', '2027-03-01', new Date(2026, 10, 15))
    expect(progress.day).toBe(0)
    expect(progress.fraction).toBe(0)
  })
})
