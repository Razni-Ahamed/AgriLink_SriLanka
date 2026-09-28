import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Desktop, Moon, Sun } from '@/components/ui/icons'
import { displayNameOf, type UserProfileResponse } from '@/auth/api'
import { useAuthStore } from '@/auth/authStore'
import { PROFILE_PATH } from '@/features/account/routes'
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/config'
import type { ThemePreference } from '@/lib/themeStorage'
import { useLanguageStore } from '@/lib/useLanguageStore'
import { useUiStore } from '@/lib/useUiStore'
import { cn } from '@/lib/utils'

interface ProfileMenuProps {
  user: UserProfileResponse
}

interface MenuEntry {
  key: string
  label: string
  icon?: ReactNode
  /** Set for a choice (language, theme): shown as a radio item, and choosing it keeps the menu open. */
  checked?: boolean
  action: MenuAction
}

// What an entry does, as data rather than a callback: the entries are built during render, and the
// actions reach for refs (to return focus), which may only happen in the click handler itself.
type MenuAction =
  | { kind: 'profile' }
  | { kind: 'logout' }
  | { kind: 'language'; code: Language }
  | { kind: 'theme'; preference: ThemePreference }

interface MenuSection {
  key: string
  /** A named group of choices, laid out side by side. */
  label?: string
  entries: MenuEntry[]
}

const LANGUAGE_LABEL_KEYS = {
  en: 'language.en',
  si: 'language.si',
  ta: 'language.ta',
} as const satisfies Record<Language, string>

// Light → System → Dark, brightest to darkest, the same order as the theme toggle.
const THEMES = [
  { preference: 'light', labelKey: 'theme.light', Icon: Sun },
  { preference: 'system', labelKey: 'theme.system', Icon: Desktop },
  { preference: 'dark', labelKey: 'theme.dark', Icon: Moon },
] as const satisfies ReadonlyArray<{
  preference: ThemePreference
  labelKey: string
  Icon: typeof Sun
}>

/**
 * The header's account button: the user's avatar and name, opening a menu with "My profile", the
 * language and theme choices, and "Log out". Follows the WAI-ARIA menu button pattern — arrow keys
 * move between items, Escape closes and returns focus to the button, and a click anywhere else
 * closes it. The choices are radio items, so a screen reader announces which one is selected.
 */
export function ProfileMenu({ user }: ProfileMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const themePreference = useUiStore((state) => state.themePreference)
  const setThemePreference = useUiStore((state) => state.setThemePreference)
  const [isOpen, setIsOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const name = displayNameOf(user)

  useEffect(() => {
    if (isOpen) {
      itemRefs.current[focusIndex]?.focus()
    }
  }, [isOpen, focusIndex])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  function open(index: number) {
    setFocusIndex(index)
    setIsOpen(true)
  }

  function close({ returnFocus }: { returnFocus: boolean }) {
    setIsOpen(false)
    if (returnFocus) {
      buttonRef.current?.focus()
    }
  }

  function openProfile() {
    close({ returnFocus: true })
    // Already open: keep the page it was opened over rather than stacking the pop-up on itself.
    if (!location.pathname.startsWith(PROFILE_PATH)) {
      navigate(PROFILE_PATH, { state: { backgroundLocation: location } })
    }
  }

  function handleLogout() {
    close({ returnFocus: false })
    logout()
    // The public home page, which has its own sign-in link for anyone who wants to come back.
    navigate('/', { replace: true })
  }

  // In order; the arrow keys move through every section's entries as one list.
  const sections: MenuSection[] = [
    {
      key: 'profile',
      entries: [
        {
          key: 'profile',
          label: t('profileMenu.myProfile'),
          icon: <UserCircle size={18} weight="duotone" />,
          action: { kind: 'profile' },
        },
      ],
    },
    {
      key: 'language',
      label: t('language.label'),
      entries: SUPPORTED_LANGUAGES.map((code) => ({
        key: code,
        label: t(LANGUAGE_LABEL_KEYS[code]),
        checked: language === code,
        action: { kind: 'language', code },
      })),
    },
    {
      key: 'theme',
      label: t('theme.label'),
      entries: THEMES.map(({ preference, labelKey, Icon }) => ({
        key: preference,
        label: t(labelKey),
        icon: (
          <Icon
            size={14}
            weight={themePreference === preference ? 'fill' : 'duotone'}
            aria-hidden="true"
          />
        ),
        checked: themePreference === preference,
        action: { kind: 'theme', preference },
      })),
    },
    {
      key: 'logout',
      entries: [
        {
          key: 'logout',
          label: t('actions.logOut'),
          icon: <SignOut size={18} weight="duotone" />,
          action: { kind: 'logout' },
        },
      ],
    },
  ]
  const items = sections.flatMap((section) => section.entries)

  function choose(action: MenuAction) {
    switch (action.kind) {
      case 'profile':
        openProfile()
        break
      case 'logout':
        handleLogout()
        break
      case 'language':
        setLanguage(action.code)
        break
      case 'theme':
        setThemePreference(action.preference)
        break
    }
  }

  // Enter and Space already fire the button's click, which opens the menu on its first item.
  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      open(0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      open(items.length - 1)
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      // Left and Right as well, since the language and theme choices sit side by side.
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        setFocusIndex((index) => (index + 1) % items.length)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        setFocusIndex((index) => (index - 1 + items.length) % items.length)
        break
      case 'Home':
        event.preventDefault()
        setFocusIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusIndex(items.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        close({ returnFocus: true })
        break
      case 'Tab':
        // Leaving the menu by Tab closes it, and focus carries on to the next control as usual.
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={t('profileMenu.button', { name })}
        onClick={() => (isOpen ? close({ returnFocus: false }) : open(0))}
        onKeyDown={handleButtonKeyDown}
        className="flex items-center gap-2 rounded-full p-0.5 text-sm text-text-secondary hover:bg-brand-forest/10 focus-visible:outline-2 focus-visible:outline-brand-forest sm:rounded-xl sm:py-1 sm:pr-2 sm:pl-1"
      >
        <UserAvatar photoUrl={user.profilePhotoUrl} role={user.role} name={name} size="sm" />
        <span className="hidden max-w-40 truncate font-medium text-text-primary sm:inline lg:hidden xl:inline">
          {name}
        </span>
        <CaretDown size={14} aria-hidden="true" className="hidden sm:inline" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('profileMenu.menuLabel')}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-brand-forest/10 bg-bg-surface p-1 shadow-lg"
        >
          {sections.map((section) => (
            <div
              key={section.key}
              role={section.label ? 'group' : undefined}
              aria-label={section.label}
              className="not-first:mt-1 not-first:border-t not-first:border-brand-forest/10 not-first:pt-1"
            >
              {section.label && (
                <p
                  aria-hidden="true"
                  className="px-3 pt-1 pb-1.5 text-xs font-medium text-text-secondary"
                >
                  {section.label}
                </p>
              )}
              <div className={section.label ? 'grid grid-cols-3 gap-1 px-1 pb-1' : undefined}>
                {section.entries.map((entry) => {
                  const index = items.indexOf(entry)
                  const isChoice = entry.checked !== undefined
                  return (
                    <button
                      key={entry.key}
                      ref={(element) => {
                        itemRefs.current[index] = element
                      }}
                      type="button"
                      role={isChoice ? 'menuitemradio' : 'menuitem'}
                      aria-checked={isChoice ? entry.checked : undefined}
                      tabIndex={index === focusIndex ? 0 : -1}
                      onClick={() => {
                        setFocusIndex(index)
                        choose(entry.action)
                      }}
                      className={cn(
                        'flex items-center focus:outline-none',
                        !isChoice &&
                          'w-full gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-brand-forest/10 focus:bg-brand-forest/10',
                        isChoice &&
                          'justify-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-brand-forest/60',
                        isChoice && entry.checked && 'bg-brand-forest text-bg-surface',
                        isChoice &&
                          !entry.checked &&
                          'text-text-secondary hover:bg-brand-forest/10 hover:text-brand-forest focus:bg-brand-forest/10',
                      )}
                    >
                      {entry.icon}
                      {entry.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
