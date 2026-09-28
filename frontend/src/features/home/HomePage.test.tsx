import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { HomePage } from './HomePage'

// The marketplace preview isn't what these tests are about; an empty list keeps it quiet.
vi.mock('@/features/marketplace/hooks/useHarvests', () => ({
  useHarvests: () => ({ data: [], isLoading: false, isError: false }),
}))

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage photos', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('describes every photo in its alt text, in words that only describe the scene', () => {
    renderHome()

    for (const alt of [
      'A farmer in a rice paddy, Ambanpola',
      'Among the tea bushes, Haputale',
      'Rice paddies from above',
      'A fruit stall, Anuradhapura',
      'Winnowing rice, Eastern Province',
      'Working a vegetable garden',
      'Out in the fields',
      'A vegetable stall, Colombo',
    ]) {
      expect(screen.getByRole('img', { name: alt })).toBeInTheDocument()
    }
    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('srcset', expect.stringMatching(/640w, .*1280w$/))
    }
  })

  it('tells the season story in three steps, each with its photo', () => {
    renderHome()

    expect(
      screen.getByRole('heading', { name: 'From a worry in the field to a sale at the market' }),
    ).toBeInTheDocument()
    for (const [title, alt] of [
      ['Spot a problem, report it', 'Tending a vegetable plot'],
      ['Get advice from an officer', 'Looking closely at the leaves'],
      ['Sell your harvest directly', 'A sale at a vegetable stall'],
    ]) {
      const step = screen.getByRole('heading', { name: title }).closest('li') as HTMLElement
      expect(within(step).getByRole('img', { name: alt })).toBeInTheDocument()
    }
  })

  it('credits the photographers in the footer', () => {
    renderHome()

    expect(
      screen.getByText(/^Photos by Indika Sriyan, .*via Unsplash and Pexels\.$/),
    ).toBeInTheDocument()
  })
})
