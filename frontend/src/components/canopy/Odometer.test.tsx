import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Odometer } from './Odometer'

describe('Odometer', () => {
  it('gives screen readers the whole formatted number once', () => {
    render(<Odometer value={21000} />)
    expect(screen.getByText('21,000')).toBeInTheDocument()
  })

  it('moves each digit reel to its digit', () => {
    const { container } = render(<Odometer value={407} />)
    const reels = [...container.querySelectorAll<HTMLElement>('.odometer-reel')]
    expect(reels.map((reel) => reel.style.transform)).toEqual([
      'translateY(-40%)',
      'translateY(0%)',
      'translateY(-70%)',
    ])
  })

  it('rolls the digits when the value changes', () => {
    const { container, rerender } = render(<Odometer value={180} />)
    rerender(<Odometer value={195} />)
    const reels = [...container.querySelectorAll<HTMLElement>('.odometer-reel')]
    expect(reels.map((reel) => reel.style.transform)).toEqual([
      'translateY(-10%)',
      'translateY(-90%)',
      'translateY(-50%)',
    ])
    expect(screen.getByText('195')).toBeInTheDocument()
  })
})
