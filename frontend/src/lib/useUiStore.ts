import { create } from 'zustand'
import {
  applyTheme,
  readStoredThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
  writeStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/themeStorage'
import {
  applyMotionLevel,
  readStoredMotionPreference,
  resolveMotionLevel,
  subscribeToSystemMotion,
  writeStoredMotionPreference,
  type MotionLevel,
  type MotionPreference,
} from '@/lib/motionLevel'

export type { ResolvedTheme, ThemePreference } from '@/lib/themeStorage'
export type { MotionLevel, MotionPreference } from '@/lib/motionLevel'

/** @deprecated Prefer `ResolvedTheme`; kept so existing imports keep compiling. */
export type Theme = ResolvedTheme

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

const TOAST_DURATION_MS = 4000

interface UiState {
  /** What the user picked — `system` follows the OS. */
  themePreference: ThemePreference
  /** What is on screen, with `system` already resolved. */
  theme: ResolvedTheme
  /** What the user picked for animations — `system` follows the device. */
  motionPreference: MotionPreference
  /** The level in use, with `system` already resolved. */
  motion: MotionLevel
  toasts: Toast[]
  setThemePreference: (preference: ThemePreference) => void
  setMotionPreference: (preference: MotionPreference) => void
  /** Flips to the opposite of what is currently *shown*, pinning the result. */
  toggleTheme: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  // Start from storage so the store agrees with what the pre-paint script in
  // index.html already rendered — no first-paint flash to correct.
  themePreference: readStoredThemePreference(),
  theme: resolveTheme(readStoredThemePreference()),
  motionPreference: readStoredMotionPreference(),
  motion: resolveMotionLevel(readStoredMotionPreference()),

  toasts: [],

  setThemePreference: (preference) => {
    writeStoredThemePreference(preference)
    const theme = resolveTheme(preference)
    applyTheme(theme)
    set({ themePreference: preference, theme })
  },

  setMotionPreference: (preference) => {
    writeStoredMotionPreference(preference)
    const motion = resolveMotionLevel(preference)
    applyMotionLevel(motion)
    set({ motionPreference: preference, motion })
  },

  toggleTheme: () => {
    // Deliberately keyed off the resolved theme, not the preference: from
    // `system` the user means "give me the other one than this", which has to
    // land on an explicit choice.
    get().setThemePreference(get().theme === 'dark' ? 'light' : 'dark')
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

let unsubscribeFromSystemTheme: (() => void) | undefined

/**
 * Paint the stored theme and start tracking the OS setting.
 *
 * Safe to call more than once — StrictMode mounts effects twice in
 * development, so the previous system-theme subscription is torn down first.
 */
export function hydrateTheme(): void {
  const preference = readStoredThemePreference()
  const theme = resolveTheme(preference)

  // No animation on hydration: there is no previous palette to fade from.
  applyTheme(theme, { animate: false })
  useUiStore.setState({ themePreference: preference, theme })

  unsubscribeFromSystemTheme?.()
  unsubscribeFromSystemTheme = subscribeToSystemTheme((systemTheme) => {
    // Only follow the OS while the user is actually on `system`; an explicit
    // light/dark choice outranks it.
    if (useUiStore.getState().themePreference !== 'system') {
      return
    }
    applyTheme(systemTheme)
    useUiStore.setState({ theme: systemTheme })
  })
}

let unsubscribeFromSystemMotion: (() => void) | undefined

/** Put the stored motion level on <html> and follow the device's reduced-motion setting. */
export function hydrateMotion(): void {
  const preference = readStoredMotionPreference()
  const motion = resolveMotionLevel(preference)
  applyMotionLevel(motion)
  useUiStore.setState({ motionPreference: preference, motion })

  unsubscribeFromSystemMotion?.()
  unsubscribeFromSystemMotion = subscribeToSystemMotion((systemLevel) => {
    if (useUiStore.getState().motionPreference !== 'system') return
    applyMotionLevel(systemLevel)
    useUiStore.setState({ motion: systemLevel })
  })
}
