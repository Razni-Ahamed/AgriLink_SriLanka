import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useOpenReportCount, useUnreadMessageCount } from '../hooks/useConversations'
import { MessagesButton } from './MessagesButton'

vi.mock('../hooks/useConversations', () => ({
  useUnreadMessageCount: vi.fn(),
  useOpenReportCount: vi.fn(),
}))
let role: string | null = 'Farmer'
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string | null }) => T) => selector({ role }),
}))

function mockCounts(unread: number | undefined, openReports: number | undefined) {
  vi.mocked(useUnreadMessageCount).mockReturnValue({ data: unread } as ReturnType<typeof useUnreadMessageCount>)
  vi.mocked(useOpenReportCount).mockReturnValue({ data: openReports } as ReturnType<typeof useOpenReportCount>)
}

function renderButton() {
  render(
    <MemoryRouter>
      <MessagesButton />
    </MemoryRouter>,
  )
}

describe('MessagesButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    role = 'Farmer'
  })

  it('links to the chats with the unread count, and polls only what the role needs', () => {
    mockCounts(3, undefined)

    renderButton()

    const link = screen.getByRole('link', { name: 'Messages, 3 unread' })
    expect(link).toHaveAttribute('href', '/messages')
    expect(link).toHaveTextContent('3')
    expect(useUnreadMessageCount).toHaveBeenCalledWith(true)
    expect(useOpenReportCount).toHaveBeenCalledWith(false)
  })

  it('shows no badge when everything is read', () => {
    mockCounts(0, undefined)

    renderButton()

    expect(screen.getByRole('link', { name: 'Messages' })).not.toHaveTextContent(/\d/)
  })

  it('takes an admin to the reported chats, counting open reports', () => {
    role = 'Admin'
    mockCounts(undefined, 12)

    renderButton()

    const link = screen.getByRole('link', { name: 'Reported chats, 12 open' })
    expect(link).toHaveAttribute('href', '/admin/reported-chats')
    expect(link).toHaveTextContent('9+')
    expect(useUnreadMessageCount).toHaveBeenCalledWith(false)
  })
})
