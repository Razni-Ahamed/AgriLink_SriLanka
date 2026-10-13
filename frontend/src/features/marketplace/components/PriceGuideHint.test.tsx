import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/config'
import type { PriceGuideResponse } from '@/types/dto/harvests'
import { usePriceGuide } from '../hooks/useHarvests'
import { PriceGuideHint } from './PriceGuideHint'

vi.mock('../hooks/useHarvests', () => ({ usePriceGuide: vi.fn() }))

function mockGuide(guide: Partial<PriceGuideResponse> | null, state: { isLoading?: boolean; isError?: boolean } = {}) {
  vi.mocked(usePriceGuide).mockReturnValue({
    data: guide
      ? {
          cropType: 'Tomato',
          district: 'Kandy',
          windowDays: 90,
          minimumSales: 3,
          inDistrict: null,
          nationwide: null,
          ...guide,
        }
      : undefined,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as ReturnType<typeof usePriceGuide>)
}

const stats = { sales: 4, totalQuantity: 400, averagePricePerUnit: 122.5, minPricePerUnit: 100, maxPricePerUnit: 160 }

describe('PriceGuideHint', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the district and nationwide averages, and fills the price with one', () => {
    mockGuide({ inDistrict: stats, nationwide: { ...stats, sales: 9, averagePricePerUnit: 110 } })
    const onUsePrice = vi.fn()

    render(<PriceGuideHint cropType="Tomato" district="Kandy" onUsePrice={onUsePrice} />)

    expect(screen.getByText('Recent prices for Tomato')).toBeInTheDocument()
    expect(screen.getByText(/In Kandy:/).parentElement).toHaveTextContent('Rs 122.5/unit on average')
    expect(screen.getByText(/All of Sri Lanka:/).parentElement).toHaveTextContent('Rs 110/unit on average')
    expect(screen.getByText(/4 sales/)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Use this price' })[0])
    expect(onUsePrice).toHaveBeenCalledWith(122.5)
  })

  it('says when a district has too few sales but the country has enough', () => {
    mockGuide({ inDistrict: null, nationwide: stats })

    render(<PriceGuideHint cropType="Tomato" district="Kandy" onUsePrice={vi.fn()} />)

    expect(screen.getByText('Not enough recent sales in Kandy yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Use this price' })).toHaveLength(1)
  })

  it('explains when there are no recent sales at all', () => {
    mockGuide({})

    render(<PriceGuideHint cropType="Tomato" district="Kandy" onUsePrice={vi.fn()} />)

    expect(screen.getByText(/Not enough recent sales of Tomato to suggest a price yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows nothing when the lookup fails, so it never gets in the way of publishing', () => {
    mockGuide(null, { isError: true })

    const { container } = render(<PriceGuideHint cropType="Tomato" district="Kandy" onUsePrice={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
