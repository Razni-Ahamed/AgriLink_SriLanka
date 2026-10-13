import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { ReviewTimingPanel } from './ReviewTimingPanel'

function renderPanel(props: Partial<Parameters<typeof ReviewTimingPanel>[0]> = {}) {
  render(
    <MemoryRouter>
      <ReviewTimingPanel
        scope="district"
        overdue={0}
        oldestPendingHours={null}
        averageReviewHours={null}
        reviewsInAverage={0}
        overdueAfterHours={48}
        queueLink="/issues/pending"
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ReviewTimingPanel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('warns about overdue issues and links the warning to the queue', () => {
    renderPanel({ overdue: 3, oldestPendingHours: 75, averageReviewHours: 20.4, reviewsInAverage: 12 })

    const warning = screen.getByRole('alert')
    expect(warning).toHaveTextContent('3 issues have waited more than 48 hours for an officer.')
    expect(warning.closest('a')).toHaveAttribute('href', '/issues/pending')
    expect(screen.getByText('Waiting over 48 h in my district')).toBeInTheDocument()
    expect(screen.getByText('3 d 3 h')).toBeInTheDocument()
    expect(screen.getByText('20 h')).toBeInTheDocument()
    expect(screen.getByText('Based on 12 reviews')).toBeInTheDocument()
  })

  it('shows no warning, and says so plainly, when nothing is waiting or reviewed', () => {
    renderPanel({ scope: 'platform' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Waiting over 48 h (all districts)')).toBeInTheDocument()
    expect(screen.getByText('None waiting')).toBeInTheDocument()
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(screen.getByText('Average review time (30 days)')).toBeInTheDocument()
  })

  it('uses the singular for one overdue issue', () => {
    renderPanel({ overdue: 1, oldestPendingHours: 50 })

    expect(screen.getByRole('alert')).toHaveTextContent('1 issue has waited more than 48 hours')
  })
})
