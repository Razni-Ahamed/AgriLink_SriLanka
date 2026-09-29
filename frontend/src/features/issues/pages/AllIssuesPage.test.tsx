import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useAllIssues } from '../hooks/useIssues'
import { AllIssuesPage } from './AllIssuesPage'

vi.mock('../hooks/useIssues', () => ({ useAllIssues: vi.fn() }))

describe('AllIssuesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.mocked(useAllIssues).mockReset()
    vi.mocked(useAllIssues).mockReturnValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useAllIssues>)
  })

  function lastCall() {
    return vi.mocked(useAllIssues).mock.calls.at(-1)
  }

  it('asks the API for the newest issues first, unfiltered, by default', () => {
    render(<AllIssuesPage />, { wrapper: MemoryRouter })

    expect(lastCall()).toEqual([1, { search: '', status: undefined, sort: 'newest' }])
  })

  it('passes the search (once typing pauses), status and order to the API', async () => {
    render(<AllIssuesPage />, { wrapper: MemoryRouter })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), ' blast ')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Resolved')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'severity')

    await waitFor(() =>
      expect(lastCall()).toEqual([1, { search: 'blast', status: 'Resolved', sort: 'severity' }]),
    )
  })

  it('says nothing matches, rather than that there are no issues, when a filter is on', async () => {
    render(<AllIssuesPage />, { wrapper: MemoryRouter })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Rejected')

    expect(screen.getByText('Nothing matches these filters.')).toBeInTheDocument()
  })
})
