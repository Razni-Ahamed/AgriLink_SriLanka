import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { SearchSortBar } from './SearchSortBar'

describe('SearchSortBar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('reports what is typed and which order is chosen', async () => {
    const onSearchChange = vi.fn()
    const onSortChange = vi.fn()
    render(
      <SearchSortBar
        search=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Name or email"
        sort="newest"
        onSortChange={onSortChange}
        sortOptions={[
          { value: 'newest', label: 'Newest first' },
          { value: 'oldest', label: 'Oldest first' },
        ]}
      >
        <p>Extra filter</p>
      </SearchSortBar>,
    )

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'k')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'oldest')

    expect(onSearchChange).toHaveBeenCalledWith('k')
    expect(onSortChange).toHaveBeenCalledWith('oldest')
    expect(screen.getByText('Extra filter')).toBeInTheDocument()
    expect(screen.getByRole('search')).toBeInTheDocument()
  })
})
