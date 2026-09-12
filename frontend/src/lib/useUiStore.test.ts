import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DARK_MEDIA_QUERY, THEME_STORAGE_KEY, type ResolvedTheme } from './themeStorage'
import { hydrateTheme, useUiStore } from './useUiStore'

type ChangeListener = (event: { matches: boolean }) => void

function mockSystemTheme(initial: ResolvedTheme) {
  const listeners = new Set<ChangeListener>()
  let matches = initial === 'dark'

  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query === DARK_MEDIA_QUERY && matches
        },
        media: query,
        addEventListener: (_: string, listener: ChangeListener) => listeners.add(listener),
        removeEventListener: (_: string, listener: ChangeListener) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  )

  return {
    set(theme: ResolvedTheme) {
      matches = theme === 'dark'
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

const isDark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('theme preference', () => {
  it('hydrates to the OS theme when the user has never chosen', () => {
    mockSystemTheme('dark')

    hydrateTheme()

    expect(useUiStore.getState().themePreference).toBe('system')
    expect(useUiStore.getState().theme).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('hydrates a light OS to the light palette', () => {
    mockSystemTheme('light')

    hydrateTheme()

    expect(useUiStore.getState().theme).toBe('light')
    expect(isDark()).toBe(false)
  })

  it('persists an explicit choice and applies it', () => {
    mockSystemTheme('light')
    hydrateTheme()

    useUiStore.getState().setThemePreference('dark')

    expect(useUiStore.getState().theme).toBe('dark')
    expect(isDark()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('toggles away from whichever theme is on screen, pinning the result', () => {
    // On `system` resolving to dark, "toggle" has to mean light — and it has
    // to stop following the OS from then on.
    mockSystemTheme('dark')
    hydrateTheme()

    useUiStore.getState().toggleTheme()

    expect(useUiStore.getState().theme).toBe('light')
    expect(useUiStore.getState().themePreference).toBe('light')

    useUiStore.getState().toggleTheme()
    expect(useUiStore.getState().theme).toBe('dark')
    expect(useUiStore.getState().themePreference).toBe('dark')
  })

  it('follows a live OS change while on system', () => {
    const system = mockSystemTheme('light')
    hydrateTheme()
    expect(isDark()).toBe(false)

    system.set('dark')

    expect(useUiStore.getState().theme).toBe('dark')
    expect(isDark()).toBe(true)
  })

  it('ignores a live OS change once the user has chosen explicitly', () => {
    const system = mockSystemTheme('light')
    hydrateTheme()
    useUiStore.getState().setThemePreference('light')

    system.set('dark')

    expect(useUiStore.getState().theme).toBe('light')
    expect(isDark()).toBe(false)
  })

  it('can be returned to system, picking the OS theme back up', () => {
    const system = mockSystemTheme('dark')
    hydrateTheme()
    useUiStore.getState().setThemePreference('light')

    useUiStore.getState().setThemePreference('system')

    expect(useUiStore.getState().theme).toBe('dark')
    expect(isDark()).toBe(true)

    system.set('light')
    expect(useUiStore.getState().theme).toBe('light')
  })

  it('does not stack system listeners across repeated hydration', () => {
    // App mounts its effect twice under StrictMode in development.
    const system = mockSystemTheme('light')
    hydrateTheme()
    hydrateTheme()

    const applied: string[] = []
    const unsubscribe = useUiStore.subscribe((state) => applied.push(state.theme))
    system.set('dark')
    unsubscribe()

    expect(applied).toEqual(['dark'])
  })
})
