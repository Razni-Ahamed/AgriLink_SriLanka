import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
  writeStoredThemePreference,
  type ResolvedTheme,
} from './themeStorage'

type ChangeListener = (event: { matches: boolean }) => void

/** Stands in for the OS setting, and lets a test flip it mid-run. */
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
    get listenerCount() {
      return listeners.size
    },
  }
}

beforeEach(() => {
  localStorage.clear()
  const root = document.documentElement
  root.className = ''
  root.removeAttribute('style')
  delete root.dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readStoredThemePreference', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readStoredThemePreference()).toBe('system')
  })

  it('round-trips each preference', () => {
    for (const preference of ['light', 'dark', 'system'] as const) {
      writeStoredThemePreference(preference)
      expect(readStoredThemePreference()).toBe(preference)
    }
  })

  it('keeps a light/dark value written by the pre-system build', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredThemePreference()).toBe('dark')
  })

  it('falls back to system for an unrecognized value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(readStoredThemePreference()).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('follows the OS when the preference is system', () => {
    mockSystemTheme('dark')
    expect(resolveTheme('system')).toBe('dark')
  })

  it('honours an explicit choice over the OS', () => {
    mockSystemTheme('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('resolves to light when the OS reports light', () => {
    mockSystemTheme('light')
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('applyTheme', () => {
  it('marks the root element for the dark palette', () => {
    applyTheme('dark')

    const root = document.documentElement
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('clears the dark palette when switching back to light', () => {
    applyTheme('dark')
    applyTheme('light')

    const root = document.documentElement
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.colorScheme).toBe('light')
  })

  it('keeps the theme-color meta in step for mobile browser chrome', () => {
    applyTheme('dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#0f1512')

    applyTheme('light')
    expect(meta?.getAttribute('content')).toBe('#faf7f0')
  })

  it('does not animate the very first paint', () => {
    // No data-theme yet means nothing to fade from, so hydration must not
    // leave the page-wide transition class behind.
    applyTheme('dark', { animate: false })
    expect(document.documentElement.classList.contains('theme-transition')).toBe(false)
  })

  it('cross-fades a later switch, then cleans the class up', () => {
    vi.useFakeTimers()
    try {
      applyTheme('light', { animate: false })

      applyTheme('dark')
      expect(document.documentElement.classList.contains('theme-transition')).toBe(true)

      vi.advanceTimersByTime(400)
      expect(document.documentElement.classList.contains('theme-transition')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('subscribeToSystemTheme', () => {
  it('reports OS changes and stops after unsubscribing', () => {
    const system = mockSystemTheme('light')
    const onChange = vi.fn()

    const unsubscribe = subscribeToSystemTheme(onChange)
    system.set('dark')
    expect(onChange).toHaveBeenCalledWith('dark')

    system.set('light')
    expect(onChange).toHaveBeenLastCalledWith('light')

    unsubscribe()
    expect(system.listenerCount).toBe(0)
  })

  it('no-ops where matchMedia is unavailable', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('unsupported')
    })

    expect(() => subscribeToSystemTheme(vi.fn())()).not.toThrow()
  })
})
