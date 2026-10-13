import { apiClient } from '@/lib/apiClient'
import type { PagedResponse } from '@/types/dto/paging'
import type {
  ChatMessage,
  ChatMessagePage,
  ConversationDetail,
  ConversationReport,
  ConversationSummary,
} from '@/types/dto/conversations'

export async function getConversations(page = 1, pageSize = 50): Promise<PagedResponse<ConversationSummary>> {
  const { data } = await apiClient.get<PagedResponse<ConversationSummary>>('/api/conversations', {
    params: { page, pageSize },
  })
  return data
}

export async function getUnreadMessageCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/api/conversations/unread-count')
  return data.count
}

/** Opens (creating on first use) the chat about a purchase request. */
export async function startDealConversation(requestId: number): Promise<ConversationDetail> {
  const { data } = await apiClient.post<ConversationDetail>(`/api/conversations/deal/${requestId}`)
  return data
}

/** Opens (creating on first use) the chat about a crop issue. */
export async function startAdviceConversation(issueId: number): Promise<ConversationDetail> {
  const { data } = await apiClient.post<ConversationDetail>(`/api/conversations/advice/${issueId}`)
  return data
}

export async function getConversation(conversationId: number): Promise<ConversationDetail> {
  const { data } = await apiClient.get<ConversationDetail>(`/api/conversations/${conversationId}`)
  return data
}

export async function getMessages(conversationId: number, beforeId?: number): Promise<ChatMessagePage> {
  const { data } = await apiClient.get<ChatMessagePage>(`/api/conversations/${conversationId}/messages`, {
    params: { beforeId },
  })
  return data
}

export async function sendMessage(conversationId: number, body: string): Promise<ChatMessage> {
  const { data } = await apiClient.post<ChatMessage>(`/api/conversations/${conversationId}/messages`, { body })
  return data
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await apiClient.put(`/api/conversations/${conversationId}/read`)
}

export async function reportConversation(conversationId: number, reason: string): Promise<void> {
  await apiClient.post(`/api/conversations/${conversationId}/report`, { reason })
}

export async function getConversationReports(): Promise<PagedResponse<ConversationReport>> {
  const { data } = await apiClient.get<PagedResponse<ConversationReport>>('/api/admin/conversation-reports', {
    params: { pageSize: 100 },
  })
  return data
}

export async function getOpenReportCount(): Promise<number> {
  const { data } = await apiClient.get<{ open: number }>('/api/admin/conversation-reports/open-count')
  return data.open
}

export async function resolveConversationReport(reportId: number, note?: string): Promise<ConversationReport> {
  const { data } = await apiClient.put<ConversationReport>(`/api/admin/conversation-reports/${reportId}/resolve`, {
    note: note || undefined,
  })
  return data
}
