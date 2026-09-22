import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { checkUsernameAvailable } from '@/auth/api'
import { normalizeUsername, usernameProblem } from './validation'

export const USERNAME_CHECK_DEBOUNCE_MS = 400

export type UsernameAvailabilityStatus =
  /** Nothing typed yet, or the field is disabled. */
  | 'idle'
  /** The caller's own current username — nothing to check. */
  | 'unchanged'
  /** Fails the local rules; the form's own validation message explains why. */
  | 'invalid'
  | 'reserved'
  | 'checking'
  | 'available'
  | 'taken'
  /** The check itself failed (offline, server down). The server still re-checks on save. */
  | 'error'

interface Options {
  enabled?: boolean
  /** The signed-in user's current username, which counts as theirs rather than taken. */
  currentUsername?: string
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Live "is this username free?" for a username field. Local rules are applied first so a
 * malformed name never costs a request, and requests wait until typing pauses for
 * USERNAME_CHECK_DEBOUNCE_MS. The answer is advisory: the server re-checks when the form is saved.
 */
export function useUsernameAvailability(
  rawUsername: string,
  { enabled = true, currentUsername }: Options = {},
): UsernameAvailabilityStatus {
  const username = normalizeUsername(rawUsername)
  const debounced = useDebouncedValue(username, USERNAME_CHECK_DEBOUNCE_MS)
  const problem = usernameProblem(username)
  const isOwn = currentUsername !== undefined && username === normalizeUsername(currentUsername)
  const shouldQuery = enabled && username.length > 0 && !problem && !isOwn && debounced === username

  const query = useQuery({
    queryKey: ['username-available', debounced],
    queryFn: ({ signal }) => checkUsernameAvailable(debounced, signal),
    enabled: shouldQuery,
    staleTime: 30_000,
    retry: false,
  })

  if (!enabled || username.length === 0) {
    return 'idle'
  }
  if (isOwn) {
    return 'unchanged'
  }
  if (problem) {
    return problem === 'reserved' ? 'reserved' : 'invalid'
  }
  if (debounced !== username || query.isFetching) {
    return 'checking'
  }
  if (query.isError) {
    return 'error'
  }
  if (!query.data) {
    return 'checking'
  }
  if (query.data.available) {
    return 'available'
  }
  return query.data.reason === 'reserved' ? 'reserved' : query.data.reason === 'invalid' ? 'invalid' : 'taken'
}
