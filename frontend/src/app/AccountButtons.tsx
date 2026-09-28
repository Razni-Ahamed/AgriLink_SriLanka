import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SignOut } from '@phosphor-icons/react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { headerButtonClass, opensOnHover, slide } from '@/components/ui/headerButtonStyles'
import { displayNameOf, type UserProfileResponse } from '@/auth/api'
import { useAuthStore } from '@/auth/authStore'
import { PROFILE_PATH } from '@/features/account/routes'
import { cn } from '@/lib/utils'

/**
 * The header's avatar (and, on very wide screens, the user's name). It opens the profile pop-up
 * straight away: with Log out now its own button, a menu would only have held "My profile".
 */
export function ProfileButton({ user }: { user: UserProfileResponse }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const name = displayNameOf(user)
  const label = `${t('profileMenu.myProfile')} (${name})`

  function openProfile() {
    // Already open: keep the page it was opened over rather than stacking the pop-up on itself.
    if (!location.pathname.startsWith(PROFILE_PATH)) {
      navigate(PROFILE_PATH, { state: { backgroundLocation: location } })
    }
  }

  return (
    <button
      type="button"
      onClick={openProfile}
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center gap-2 rounded-full p-0.5 text-sm hover:bg-brand-forest/10 focus-visible:outline-2 focus-visible:outline-brand-forest 2xl:rounded-xl 2xl:py-1 2xl:pr-3 2xl:pl-1"
    >
      <UserAvatar photoUrl={user.profilePhotoUrl} role={user.role} name={name} size="sm" />
      <span className="hidden max-w-40 truncate font-medium text-text-primary 2xl:inline">
        {name}
      </span>
    </button>
  )
}

/** Logs out and goes to the public home page. An icon that widens to "Log out" on hover. */
export function LogoutButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const label = t('actions.logOut')

  function handleLogout() {
    logout()
    // The public home page, which has its own sign-in link for anyone who wants to come back.
    navigate('/', { replace: true })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label={label}
      className={cn(headerButtonClass, 'text-sm font-medium')}
    >
      <SignOut size={20} weight="duotone" aria-hidden="true" className="shrink-0" />
      <span
        className={cn(slide, opensOnHover, 'ml-0 group-hover:ml-2 group-focus-visible:ml-2')}
        aria-hidden="true"
      >
        <span className="overflow-hidden whitespace-nowrap">{label}</span>
      </span>
    </button>
  )
}
