import type { RouteObject } from 'react-router-dom'
import { RequireRole } from '@/app/RequireRole'
import { MessagesPage } from './pages/MessagesPage'
import { ReportedChatPage, ReportedChatsPage } from './pages/ReportedChatsPage'

// No nav tab: the header's chat button (beside the bell) opens these, so the tab bars don't grow.
export const messagesRoutes: RouteObject[] = [
  {
    // api/conversations takes part only for farmers, buyers and officers; an admin reads a chat
    // only after it is reported, from the reported-chats pages.
    element: <RequireRole allow={['Farmer', 'Buyer', 'Officer']} />,
    children: [
      { path: '/messages', element: <MessagesPage /> },
      { path: '/messages/:conversationId', element: <MessagesPage /> },
    ],
  },
  {
    element: <RequireRole allow={['Admin']} />,
    children: [
      { path: '/admin/reported-chats', element: <ReportedChatsPage /> },
      { path: '/admin/reported-chats/:conversationId', element: <ReportedChatPage /> },
    ],
  },
]
