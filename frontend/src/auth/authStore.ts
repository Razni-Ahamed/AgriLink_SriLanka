import { isAxiosError } from 'axios'
import { create } from 'zustand'
import type { Role } from '@/types/common'
import { getCurrentUser, type UserProfileResponse } from './api'

const STORAGE_KEY = 'agrilink.auth'

interface StoredSession {
  token: string
  role: Role
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

/**
 * True when the token's own `exp` has passed, or the token can't be read at all. Sessions last 8
 * hours; trusting an expired one sent a returning visitor from `/` to their role's page, whose first
 * request came back 401 and bounced them to the login page instead of the landing page.
 */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: unknown }
    return typeof exp !== 'number' || exp * 1000 <= now
  } catch {
    return true
  }
}

function writeStoredSession(session: StoredSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

interface AuthState {
  token: string | null
  role: Role | null
  user: UserProfileResponse | null
  isHydrated: boolean
  login: (token: string, role: Role) => void
  logout: () => void
  hydrate: () => void
  /** Replaces the cached profile, e.g. with the one a profile update just returned. */
  setUser: (user: UserProfileResponse) => void
  /** Re-reads the profile from GET /api/users/me so the header and every other reader stay current. */
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  role: null,
  user: null,
  isHydrated: false,

  login: (token, role) => {
    writeStoredSession({ token, role })
    set({ token, role, isHydrated: true })
    void getCurrentUser()
      .then((user) => set({ user }))
      .catch(() => undefined)
  },

  logout: () => {
    writeStoredSession(null)
    set({ token: null, role: null, user: null, isHydrated: true })
  },

  setUser: (user) => {
    if (get().token) {
      set({ user })
    }
  },

  refreshUser: async () => {
    if (!get().token) {
      return
    }
    try {
      const user = await getCurrentUser()
      // A logout while the request was in flight wins.
      if (get().token) {
        set({ user })
      }
    } catch {
      // The profile shown is merely stale; a rejected session is handled by the apiClient interceptor.
    }
  },

  hydrate: () => {
    const session = readStoredSession()
    if (!session || isTokenExpired(session.token)) {
      if (session) {
        writeStoredSession(null)
      }
      set({ isHydrated: true })
      return
    }

    set({ token: session.token, role: session.role, isHydrated: true })
    void getCurrentUser()
      .then((user) => set({ user }))
      .catch((error: unknown) => {
        // Only a rejected session ends it. A network error or a slow cold start on the API host
        // must not log the user out; a 401 is already handled by the apiClient interceptor.
        const status = isAxiosError(error) ? error.response?.status : undefined
        if (status === 401 || status === 403 || status === 404) {
          writeStoredSession(null)
          set({ token: null, role: null, user: null })
        }
      })
  },
}))
