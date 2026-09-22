import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import type { CropIssueResponse } from '@/types/dto/issues'
import { useMyIssues } from '../hooks/useIssues'
import { MyIssuesPage } from './MyIssuesPage'

vi.mock('../hooks/useIssues', () => ({ useMyIssues: vi.fn() }))

function issue(overrides: Partial<CropIssueResponse>): CropIssueResponse {
  return {
    issueId: 1,
    cropId: 1,
    cropType: 'Cassava',
    variety: '',
    district: 'Kandy',
    reporterName: '',
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

function renderWith(issues: CropIssueResponse[]) {
  vi.mocked(useMyIssues).mockReturnValue({
    data: { items: issues, page: 1, pageSize: 20, totalCount: issues.length, totalPages: 1 },
    isLoading: false,
    isFetching: false,
  } as ReturnType<typeof useMyIssues>)
  render(
    <MemoryRouter>
      <MyIssuesPage />
    </MemoryRouter>,
  )
}

describe('MyIssuesPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('links to preliminary advice and marks it as preliminary', () => {
    renderWith([
      issue({
        issueId: 1,
        advisoryId: 11,
        title: 'Photo diagnosed',
        advisoryStatus: 'Preliminary',
        hasPhoto: true,
      }),
    ])

    const link = screen.getByRole('link', { name: /Photo diagnosed/ })
    expect(link).toHaveAttribute('href', '/advisories/11')
    expect(screen.getByText('Preliminary')).toBeInTheDocument()
    expect(screen.getByLabelText('Photo attached')).toBeInTheDocument()
  })

  it('does not link to advice still held back for the officer', () => {
    renderWith([issue({ issueId: 2, advisoryId: 12, title: 'Held back', advisoryStatus: 'Draft' })])

    expect(screen.getByText('Held back')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Held back/ })).not.toBeInTheDocument()
  })
})
