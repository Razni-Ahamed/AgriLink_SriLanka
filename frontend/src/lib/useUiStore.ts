import { create } from 'zustand'

export type Theme = 'light' | 'dark'
export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

const THEME_STORAGE_KEY = 'agrilink.theme'
const TOAST_DURATION_MS = 4000

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface UiState {
  theme: Theme
  toasts: Toast[]
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'light',

  toasts: [],

  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable — theme just won't persist across reloads
    }
    applyThemeClass(theme)
    set({ theme })
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },

  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => get().removeToast(id), TOAST_DURATION_MS)
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

export function hydrateTheme(): void {
  applyThemeClass(readStoredTheme())
  useUiStore.setState({ theme: readStoredTheme() })
}
