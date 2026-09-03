import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { LoginPage } from '@/auth/LoginPage'
import { hydrateLanguage, useLanguageStore } from '@/lib/useLanguageStore'
import { readStoredLanguage } from '@/i18n/languageStorage'

function renderLoginPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('language switching', () => {
  beforeEach(async () => {
    localStorage.clear()
    useLanguageStore.setState({ language: 'en' })
    await i18n.changeLanguage('en')
  })

  it('renders the sign-in page in English by default', () => {
    renderLoginPage()

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('translates the sign-in page when Sinhala is selected', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'සිංහල' }))

    expect(screen.getByText('ඔබගේ ගිණුමට පිවිසෙන්න')).toBeInTheDocument()
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument()
  })

  it('translates the sign-in page when Tamil is selected', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'தமிழ்' }))

    expect(screen.getByText('உங்கள் கணக்கில் உள்நுழையவும்')).toBeInTheDocument()
  })

  it('persists the chosen language and restores it on next load', async () => {
    const user = userEvent.setup()
    const { unmount } = renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'தமிழ்' }))
    expect(localStorage.getItem('agrilink.language')).toBe('ta')

    unmount()
    useLanguageStore.setState({ language: 'en' })
    await i18n.changeLanguage('en')

    hydrateLanguage()
    renderLoginPage()

    expect(useLanguageStore.getState().language).toBe('ta')
    expect(screen.getByText('உங்கள் கணக்கில் உள்நுழையவும்')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ta')
  })

  it('starts i18next in the stored language, with no English first paint', async () => {
    // Regression: hydrating the language in an effect rendered one frame in
    // English before swapping, which read as a flicker on load.
    localStorage.setItem('agrilink.language', 'si')
    expect(readStoredLanguage()).toBe('si')

    vi.resetModules()
    const freshI18n = (await import('@/i18n/config')).default

    expect(freshI18n.language).toBe('si')
  })

  it('has a translation for every English key in all three languages', () => {
    const namespaces = ['common', 'auth', 'farms', 'marketplace', 'orders'] as const

    function leafKeys(value: unknown, prefix = ''): string[] {
      if (typeof value !== 'object' || value === null) return [prefix]
      return Object.entries(value).flatMap(([key, child]) =>
        leafKeys(child, prefix ? `${prefix}.${key}` : key),
      )
    }

    for (const ns of namespaces) {
      const englishKeys = leafKeys(i18n.getResourceBundle('en', ns))
      for (const language of ['si', 'ta'] as const) {
        const bundle = i18n.getResourceBundle(language, ns)
        const missing = englishKeys.filter((key) => !leafKeys(bundle).includes(key))
        expect(missing, `${language}/${ns} is missing keys`).toEqual([])
      }
    }
  })
})
