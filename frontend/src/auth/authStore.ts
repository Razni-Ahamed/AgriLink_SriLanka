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
}

export const useAuthStore = create<AuthState>((set) => ({
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

  hydrate: () => {
    const session = readStoredSession()
    if (!session) {
      set({ isHydrated: true })
      return
    }

    set({ token: session.token, role: session.role, isHydrated: true })
    void getCurrentUser()
      .then((user) => set({ user }))
      .catch(() => {
        writeStoredSession(null)
        set({ token: null, role: null, user: null })
      })
  },
}))
