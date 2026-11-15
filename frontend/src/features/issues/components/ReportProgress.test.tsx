import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/config'
import { ReportProgress } from './ReportProgress'

function currentStep() {
  return document.querySelector('[aria-current="step"]')?.textContent ?? null
}

describe('ReportProgress', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await act(() => i18n.changeLanguage('en'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('walks through the steps over time and holds on the last until the answer arrives', () => {
    render(<ReportProgress photoUrl="/photo.webp" hasPhoto done={false} />)
    expect(currentStep()).toBe('Sending your report')

    act(() => vi.advanceTimersByTime(2000))
    expect(currentStep()).toBe('Looking at your photo')

    act(() => vi.advanceTimersByTime(60_000))
    expect(currentStep()).toBe('Writing advice for an officer to check')
  })

  it('skips the photo step when no photo was attached', () => {
    render(<ReportProgress photoUrl="/crop.webp" hasPhoto={false} done={false} />)
    expect(screen.queryByText('Looking at your photo')).not.toBeInTheDocument()
  })

  it('ticks every step once the server has answered', () => {
    render(<ReportProgress photoUrl="/photo.webp" hasPhoto done />)
    expect(currentStep()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Report sent' })).toBeInTheDocument()
  })
})
