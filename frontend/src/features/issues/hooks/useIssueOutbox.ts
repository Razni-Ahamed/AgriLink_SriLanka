import { useEffect, useState } from 'react'
import { tokenUserId, useAuthStore } from '@/auth/authStore'
import { getQueuedIssueReports, subscribeToOutbox } from '../lib/issueOutbox'

/** The signed-in farmer's id for the outbox, or null when nobody is signed in. */
export function useOutboxOwner(): string | null {
  const token = useAuthStore((state) => state.token)
  return token ? tokenUserId(token) : null
}

/** How many of the signed-in farmer's reports are waiting to be sent. */
export function useQueuedIssueCount(): number {
  const ownerId = useOutboxOwner()
  const [counted, setCounted] = useState<{ ownerId: string; count: number } | null>(null)

  useEffect(() => {
    if (!ownerId) return
    let active = true
    const read = () =>
      void getQueuedIssueReports(ownerId)
        .then((reports) => active && setCounted({ ownerId, count: reports.length }))
        .catch(() => undefined)
    read()
    const unsubscribe = subscribeToOutbox(read)
    return () => {
      active = false
      unsubscribe()
    }
  }, [ownerId])

  // A count read for someone else (before a sign-out) never shows.
  return counted && counted.ownerId === ownerId ? counted.count : 0
}
