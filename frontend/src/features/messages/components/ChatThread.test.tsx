import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '@/i18n/config'
import type { ChatMessage, ConversationDetail } from '@/types/dto/conversations'
import {
  useConversation,
  useMarkConversationRead,
  useMessages,
  useReportConversation,
  useSendMessage,
} from '../hooks/useConversations'
import { ChatThread } from './ChatThread'

vi.mock('../hooks/useConversations', () => ({
  useConversation: vi.fn(),
  useMessages: vi.fn(),
  useSendMessage: vi.fn(),
  useMarkConversationRead: vi.fn(),
  useReportConversation: vi.fn(),
}))
let role = 'Farmer'
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string }) => T) => selector({ role }),
}))

const send = vi.fn()
const markRead = vi.fn()

function chat(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    conversationId: 7,
    kind: 'Deal',
    title: 'Tomato',
    cropType: 'Tomato',
    quantity: 50,
    district: 'Kandy',
    counterpartName: 'Kamala Stores',
    counterpartRole: 'Buyer',
    counterpartBusinessName: 'Kamala Traders',
    counterpartPhotoUrl: null,
    requestId: 1,
    orderId: null,
    harvestId: 1,
    issueId: null,
    advisoryId: null,
    isClosed: false,
    canSend: true,
    reportedByMe: false,
    counterpartLastReadMessageId: null,
    participants: null,
    ...overrides,
  }
}

function message(id: number, isMine: boolean, body: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    messageId: id,
    senderUserId: isMine ? 10 : 20,
    senderName: isMine ? 'Nimal Perera' : 'Kamala Stores',
    senderRole: isMine ? 'Farmer' : 'Buyer',
    senderPhotoUrl: null,
    body,
    createdAt: new Date().toISOString(),
    isMine,
    ...extra,
  }
}

function setup(detail: ConversationDetail, messages: ChatMessage[], sendState: Partial<ReturnType<typeof useSendMessage>> = {}) {
  vi.mocked(useConversation).mockReturnValue({ data: detail, isLoading: false, isError: false } as ReturnType<typeof useConversation>)
  vi.mocked(useMessages).mockReturnValue({
    data: { items: messages, hasOlder: false },
    isError: false,
  } as unknown as ReturnType<typeof useMessages>)
  vi.mocked(useSendMessage).mockReturnValue({
    mutate: send,
    isPending: false,
    isError: false,
    error: null,
    ...sendState,
  } as unknown as ReturnType<typeof useSendMessage>)
  vi.mocked(useMarkConversationRead).mockReturnValue({ mutate: markRead } as unknown as ReturnType<typeof useMarkConversationRead>)
  vi.mocked(useReportConversation).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useReportConversation>)
}

function renderThread(mode: 'participant' | 'admin' = 'participant') {
  render(
    <MemoryRouter>
      <ChatThread conversationId={7} mode={mode} backTo="/messages" backLabel="All chats" />
    </MemoryRouter>,
  )
}

describe('ChatThread', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    role = 'Farmer'
    send.mockClear()
    markRead.mockClear()
  })

  it('shows who the chat is with and what it is about, with the messages in order', () => {
    setup(chat(), [message(1, false, 'Can you do 110 a kg?'), message(2, true, 'Yes, for 50 kg')])

    renderThread()

    expect(screen.getByRole('heading', { name: 'Kamala Stores' })).toBeInTheDocument()
    expect(screen.getByText('Buyer · Kamala Traders')).toBeInTheDocument()
    expect(screen.getByText('Purchase request')).toBeInTheDocument()
    expect(screen.getByText('Tomato · 50 kg')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View request' })).toHaveAttribute('href', '/marketplace/requests')
    const log = screen.getByRole('log')
    const bodies = within(log).getAllByText(/110 a kg|for 50 kg/).map((element) => element.textContent)
    expect(bodies).toEqual(['Can you do 110 a kg?', 'Yes, for 50 kg'])
    expect(within(log).getByText('Today')).toBeInTheDocument()
  })

  it('marks the chat read when the other side has written', () => {
    setup(chat(), [message(1, false, 'Hello')])

    renderThread()

    expect(markRead).toHaveBeenCalledWith(7)
  })

  it('shows Seen under my last message once the other side has read it', () => {
    setup(chat({ counterpartLastReadMessageId: 2 }), [message(1, false, 'Hi'), message(2, true, 'Hello')])

    renderThread()

    expect(screen.getByText('Seen')).toBeInTheDocument()
  })

  it('sends with Enter, adds a new line with Shift+Enter, and never sends a blank message', () => {
    setup(chat(), [])
    renderThread()
    const box = screen.getByLabelText('Message')

    fireEvent.keyDown(box, { key: 'Enter' })
    expect(send).not.toHaveBeenCalled()

    fireEvent.change(box, { target: { value: '  Is Friday OK?  ' } })
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(send).not.toHaveBeenCalled()

    fireEvent.keyDown(box, { key: 'Enter' })
    expect(send).toHaveBeenCalledWith('Is Friday OK?', expect.anything())
  })

  it('explains a rate-limit refusal in the reader’s words', () => {
    const tooMany = new AxiosError('429', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    })
    setup(chat(), [], { isError: true, error: tooMany })

    renderThread()

    expect(screen.getByRole('alert')).toHaveTextContent("You're sending messages too quickly.")
  })

  it('a closed chat can be read but has no message box', () => {
    setup(chat({ isClosed: true, canSend: false }), [message(1, true, 'Thanks anyway')])

    renderThread()

    expect(screen.getByText('This request was declined or withdrawn, so this chat is closed.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
  })

  it('an advice chat names each officer who answers', () => {
    setup(
      chat({ kind: 'Advice', title: 'Leaves curling', counterpartName: null, counterpartRole: 'Officer', advisoryId: 5, requestId: null }),
      [
        message(1, true, 'Is it spreading?', { senderRole: 'Farmer' }),
        message(2, false, 'Send a closer photo', { senderName: 'Officer Kandy', senderRole: 'Officer' }),
      ],
    )

    renderThread()

    expect(screen.getByRole('heading', { name: 'Officers · Kandy' })).toBeInTheDocument()
    expect(screen.getByText('Officer Kandy · Agricultural officer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View advice' })).toHaveAttribute('href', '/advisories/5')
  })

  it('an admin reading a reported chat sees both sides and cannot post or report', () => {
    role = 'Admin'
    setup(
      chat({
        canSend: false,
        counterpartName: null,
        counterpartRole: '',
        participants: [
          { name: 'Nimal Perera', role: 'Farmer' },
          { name: 'Kamala Stores', role: 'Buyer' },
        ],
      }),
      [message(1, false, 'Pay me outside the app', { senderName: 'Nimal Perera', senderRole: 'Farmer' })],
    )

    renderThread('admin')

    expect(screen.getByRole('heading', { name: 'Between Nimal Perera (farmer) and Kamala Stores' })).toBeInTheDocument()
    expect(screen.getByText(/Admins can't post in it/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Report' })).not.toBeInTheDocument()
    expect(markRead).not.toHaveBeenCalled()
  })

  it('opens the report form', () => {
    setup(chat(), [])
    renderThread()

    fireEvent.click(screen.getByRole('button', { name: 'Report' }))

    expect(screen.getByRole('dialog', { name: 'Report this chat' })).toBeInTheDocument()
  })
})
