/** A deal chat is about one purchase request; an advice chat about one crop issue. */
export type ConversationKind = 'Deal' | 'Advice'

export type ChatRole = 'Farmer' | 'Buyer' | 'Officer'

export interface ConversationSummary {
  conversationId: number
  kind: ConversationKind
  /** Deal: the crop. Advice: the issue's title. */
  title: string
  cropType: string
  quantity: number | null
  district: string
  /** Null for a farmer's advice chat, which is with the district's officers as a group. */
  counterpartName: string | null
  counterpartRole: ChatRole
  counterpartPhotoUrl: string | null
  lastMessagePreview: string | null
  lastMessageIsMine: boolean
  lastMessageAt: string | null
  unreadCount: number
}

export interface ConversationParticipant {
  /** For the officer side of an advice chat, the district rather than a person. */
  name: string
  role: ChatRole
}

export interface ConversationDetail {
  conversationId: number
  kind: ConversationKind
  title: string
  cropType: string
  quantity: number | null
  district: string
  counterpartName: string | null
  /** Empty for an admin reviewing a report; see participants instead. */
  counterpartRole: ChatRole | ''
  counterpartBusinessName: string | null
  counterpartPhotoUrl: string | null
  requestId: number | null
  orderId: number | null
  harvestId: number | null
  issueId: number | null
  advisoryId: number | null
  /** A declined or withdrawn request with no order: readable, but no new messages. */
  isClosed: boolean
  canSend: boolean
  reportedByMe: boolean
  /** For "Seen" under the caller's own messages. */
  counterpartLastReadMessageId: number | null
  /** Filled in for an admin reviewing a reported chat. */
  participants: ConversationParticipant[] | null
}

export interface ChatMessage {
  messageId: number
  senderUserId: number
  senderName: string
  senderRole: ChatRole
  senderPhotoUrl: string | null
  body: string
  createdAt: string
  isMine: boolean
}

export interface ChatMessagePage {
  /** Oldest first. */
  items: ChatMessage[]
  hasOlder: boolean
}

export interface ConversationReport {
  reportId: number
  conversationId: number
  kind: ConversationKind
  title: string
  reporterName: string
  reason: string
  createdAt: string
  resolvedAt: string | null
  resolvedByName: string | null
  resolutionNote: string | null
}
