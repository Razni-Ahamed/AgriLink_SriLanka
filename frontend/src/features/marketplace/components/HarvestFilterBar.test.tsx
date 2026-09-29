import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { HarvestFilterBar } from './HarvestFilterBar'

vi.mock('@/lib/useCropTypes', () => ({
  useCropTypes: () => ({ data: ['Tomato', 'Paddy'], isLoading: false }),
}))
vi.mock('@/lib/useDistricts', () => ({
  useDistricts: () => ({ data: ['Kandy', 'Galle'], isLoading: false }),
}))

describe('HarvestFilterBar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('sends the search and price range when Search is pressed', async () => {
    const onChange = vi.fn()
    render(<HarvestFilterBar filters={{ sort: 'priceAsc' }} onChange={onChange} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), '  roma ')
    await userEvent.type(screen.getByLabelText('Min price/unit'), '50')
    await userEvent.type(screen.getByLabelText('Max price/unit'), '200')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onChange).toHaveBeenLastCalledWith({
      search: 'roma',
      cropType: undefined,
      district: undefined,
      minPrice: 50,
      maxPrice: 200,
      sort: 'priceAsc',
    })
  })

  it('applies a new sort order straight away, keeping the other filters', async () => {
    const onChange = vi.fn()
    render(<HarvestFilterBar filters={{ district: 'Kandy', sort: 'newest' }} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'freshest')

    expect(onChange).toHaveBeenCalledWith({ district: 'Kandy', sort: 'freshest' })
  })
})
