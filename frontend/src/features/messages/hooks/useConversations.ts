import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/conversationsApi'

/** How often an open chat, the chat list and the header badge check for new messages. The free
 *  App Service plan allows only a few live connections, so the website polls instead; React
 *  Query pauses polling while the tab is hidden. */
export const OPEN_CHAT_POLL_MS = 10_000
export const CHAT_LIST_POLL_MS = 30_000

const conversationsKey = ['conversations'] as const
const listKey = ['conversations', 'list'] as const
const unreadKey = ['conversations', 'unread-count'] as const
const detailKey = (id: number) => ['conversations', 'detail', id] as const
const messagesKey = (id: number) => ['conversations', 'messages', id] as const
const reportsKey = ['conversation-reports'] as const

export function useConversations() {
  return useQuery({ queryKey: listKey, queryFn: () => api.getConversations(), refetchInterval: CHAT_LIST_POLL_MS })
}

export function useUnreadMessageCount(enabled = true) {
  return useQuery({
    queryKey: unreadKey,
    queryFn: api.getUnreadMessageCount,
    refetchInterval: CHAT_LIST_POLL_MS,
    enabled,
  })
}

export function useConversation(conversationId: number) {
  return useQuery({
    queryKey: detailKey(conversationId),
    queryFn: () => api.getConversation(conversationId),
    enabled: Number.isFinite(conversationId) && conversationId > 0,
    // The other side's read position drives the "Seen" mark, so this refreshes with the messages.
    refetchInterval: OPEN_CHAT_POLL_MS,
    retry: false,
  })
}

export function useMessages(conversationId: number) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => api.getMessages(conversationId),
    enabled: Number.isFinite(conversationId) && conversationId > 0,
    refetchInterval: OPEN_CHAT_POLL_MS,
    retry: false,
  })
}

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(conversationId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: conversationsKey }),
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markConversationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unreadKey })
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}

export type ChatSubject = { kind: 'Deal'; requestId: number } | { kind: 'Advice'; issueId: number }

export function useStartConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subject: ChatSubject) =>
      subject.kind === 'Deal' ? api.startDealConversation(subject.requestId) : api.startAdviceConversation(subject.issueId),
    onSuccess: (conversation) => queryClient.setQueryData(detailKey(conversation.conversationId), conversation),
  })
}

export function useReportConversation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => api.reportConversation(conversationId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(conversationId) }),
  })
}

export function useConversationReports() {
  return useQuery({ queryKey: reportsKey, queryFn: api.getConversationReports })
}

export function useOpenReportCount(enabled = true) {
  return useQuery({
    queryKey: [...reportsKey, 'open-count'],
    queryFn: api.getOpenReportCount,
    refetchInterval: CHAT_LIST_POLL_MS,
    enabled,
  })
}

export function useResolveConversationReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reportId, note }: { reportId: number; note?: string }) => api.resolveConversationReport(reportId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }),
  })
}
