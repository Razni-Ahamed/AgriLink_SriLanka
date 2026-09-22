import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import type { CropIssueResponse } from '@/types/dto/issues'
import { usePendingIssues } from '../hooks/useIssues'
import { PendingIssuesPage } from './PendingIssuesPage'

vi.mock('../hooks/useIssues', () => ({ usePendingIssues: vi.fn() }))
// The real store pulls in the API client, whose settings check throws where no .env exists (CI).
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string; user: { district: string } }) => T) =>
    selector({ role: 'Officer', user: { district: 'Kandy' } }),
}))

function issue(overrides: Partial<CropIssueResponse>): CropIssueResponse {
  return {
    issueId: 1,
    cropId: 1,
    cropType: 'Cassava',
    variety: '',
    district: 'Kandy',
    reporterName: 'Farmer',
    title: 'Issue',
    description: 'd',
    severity: 'Medium',
    status: 'AwaitingReview',
    createdAt: '2026-09-17T10:00:00Z',
    advisoryId: 1,
    advisoryStatus: 'Draft',
    hasPhoto: false,
    ...overrides,
  }
}

describe('PendingIssuesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('tells cases needing a decision apart from preliminary advice to confirm, and marks photos', () => {
    const issues = [
      issue({
        issueId: 1,
        advisoryId: 11,
        title: 'Held back',
        advisoryStatus: 'Draft',
        hasPhoto: true,
      }),
      issue({
        issueId: 2,
        advisoryId: 12,
        title: 'Already advised',
        advisoryStatus: 'Preliminary',
      }),
    ]
    vi.mocked(usePendingIssues).mockReturnValue({
      data: { items: issues, page: 1, pageSize: 20, totalCount: issues.length, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as ReturnType<typeof usePendingIssues>)

    render(
      <MemoryRouter>
        <PendingIssuesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Showing issues in Kandy')).toBeInTheDocument()
    const heldBack = screen.getByRole('link', { name: /Held back/ })
    expect(within(heldBack).getByText('Needs your decision')).toBeInTheDocument()
    expect(within(heldBack).getByLabelText('Photo attached')).toBeInTheDocument()

    const advised = screen.getByRole('link', { name: /Already advised/ })
    expect(within(advised).getByText('Advice sent — confirm')).toBeInTheDocument()
    expect(within(advised).queryByLabelText('Photo attached')).not.toBeInTheDocument()
    expect(advised).toHaveAttribute('href', '/advisories/12')
  })
})
