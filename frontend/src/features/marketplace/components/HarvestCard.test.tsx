import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import type { HarvestListingResponse } from '@/types/dto/harvests'
import { HarvestCard } from './HarvestCard'

const banana: HarvestListingResponse = {
  harvestId: 7,
  farmerProfileId: 1,
  cropId: 3,
  cropType: 'Banana',
  variety: 'Ambul',
  quantity: 40,
  availableQuantity: 25,
  harvestDate: '2026-11-01',
  pricePerUnit: 450,
  unit: 'Bunch',
  location: 'Kandy',
  district: 'Kandy',
  status: 'Active',
  createdAt: '2026-11-01T08:00:00Z',
}

describe('HarvestCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('leads with the crop and its price per unit, and links to the listing', () => {
    render(
      <MemoryRouter>
        <HarvestCard harvest={banana} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Banana' })).toBeInTheDocument()
    expect(screen.getByText('Rs 450/bunch')).toBeInTheDocument()
    expect(screen.getByText('25 bunches available')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/marketplace/7')
  })
})
