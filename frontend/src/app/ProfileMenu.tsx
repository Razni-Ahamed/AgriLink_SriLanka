import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { displayNameOf, type UserProfileResponse } from '@/auth/api'
import { useAuthStore } from '@/auth/authStore'
import { PROFILE_PATH } from '@/features/account/routes'
import { cn } from '@/lib/utils'

interface ProfileMenuProps {
  user: UserProfileResponse
}

/**
 * The header's account button: the user's avatar and name, opening a menu with "My profile" and
 * "Log out". Follows the WAI-ARIA menu button pattern — arrow keys move between items, Escape
 * closes and returns focus to the button, and a click anywhere else closes it.
 */
export function ProfileMenu({ user }: ProfileMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const [isOpen, setIsOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const name = displayNameOf(user)

  const items = [
    { key: 'profile', label: t('profileMenu.myProfile'), icon: <UserCircle size={18} weight="duotone" /> },
    { key: 'logout', label: t('actions.logOut'), icon: <SignOut size={18} weight="duotone" /> },
  ] as const

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
    navigate('/login', { replace: true })
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
      case 'ArrowDown':
        event.preventDefault()
        setFocusIndex((index) => (index + 1) % items.length)
        break
      case 'ArrowUp':
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
        <span className="hidden max-w-40 truncate font-medium text-text-primary sm:inline">{name}</span>
        <CaretDown size={14} aria-hidden="true" className="hidden sm:inline" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('profileMenu.menuLabel')}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-brand-forest/10 bg-bg-surface p-1 shadow-lg"
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              type="button"
              role="menuitem"
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => (item.key === 'profile' ? openProfile() : handleLogout())}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-primary',
                'hover:bg-brand-forest/10 focus:bg-brand-forest/10 focus:outline-none',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
