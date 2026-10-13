import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import type { ConversationSummary } from '@/types/dto/conversations'
import { ConversationList } from './ConversationList'

function summary(overrides: Partial<ConversationSummary>): ConversationSummary {
  return {
    conversationId: 1,
    kind: 'Deal',
    title: 'Tomato',
    cropType: 'Tomato',
    quantity: 50,
    district: 'Kandy',
    counterpartName: 'Kamala Stores',
    counterpartRole: 'Buyer',
    counterpartPhotoUrl: null,
    lastMessagePreview: 'Can you do 110?',
    lastMessageIsMine: false,
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    ...overrides,
  }
}

describe('ConversationList', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows who each chat is with, what it is about, the last message and unread counts', () => {
    render(
      <MemoryRouter>
        <ConversationList
          selectedId={2}
          conversations={[
            summary({ conversationId: 1, unreadCount: 2 }),
            summary({
              conversationId: 2,
              kind: 'Advice',
              title: 'Leaves curling',
              counterpartName: null,
              counterpartRole: 'Officer',
              lastMessagePreview: 'Is it spreading?',
              lastMessageIsMine: true,
            }),
          ]}
        />
      </MemoryRouter>,
    )

    const [deal, advice] = screen.getAllByRole('link')
    expect(deal).toHaveAttribute('href', '/messages/1')
    expect(within(deal).getByText('Kamala Stores')).toBeInTheDocument()
    expect(within(deal).getByText('Purchase request · Tomato · 50 kg')).toBeInTheDocument()
    expect(within(deal).getByLabelText('2 unread messages')).toHaveTextContent('2')

    expect(advice).toHaveAttribute('aria-current', 'page')
    expect(within(advice).getByText('Officers · Kandy')).toBeInTheDocument()
    expect(within(advice).getByText('Crop advice · Leaves curling')).toBeInTheDocument()
    expect(within(advice).getByText('You: Is it spreading?')).toBeInTheDocument()
  })

  it('is translated', async () => {
    await i18n.changeLanguage('ta')
    render(
      <MemoryRouter>
        <ConversationList conversations={[summary({ lastMessageIsMine: true })]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('நீங்கள்: Can you do 110?')).toBeInTheDocument()
  })
})
