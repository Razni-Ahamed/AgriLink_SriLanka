import { AnimatePresence, motion } from 'motion/react'
import {
  NavLink,
  Outlet,
  matchRoutes,
  renderMatches,
  useLocation,
  useMatch,
  useNavigate,
  type Location,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/auth/authStore'
import { getNavItemsForRole } from './navConfig'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ToastViewport } from '@/components/ui/Toast'
import { NotificationBell } from '@/features/orders/components/NotificationBell'
import { ProfileDialog, type ProfileTab } from '@/features/account/components/ProfileDialog'
import { PROFILE_PATH, PROFILE_SECURITY_PATH } from '@/features/account/routes'
import { pageRoutes } from './pageRoutes'
import { ProfileMenu } from './ProfileMenu'
import { roleHome } from './roleHome'

interface ProfileRouteState {
  /** Where the user was when they opened the pop-up; that page stays visible behind it. */
  backgroundLocation?: Location
}

export function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const navItems = getNavItemsForRole(role)

  const isProfileGeneral = useMatch(PROFILE_PATH) !== null
  const isProfileSecurity = useMatch(PROFILE_SECURITY_PATH) !== null
  const isProfileOpen = (isProfileGeneral || isProfileSecurity) && token !== null
  const routeState = location.state as ProfileRouteState | null
  const openedFrom = routeState?.backgroundLocation?.pathname.startsWith(PROFILE_PATH)
    ? undefined
    : routeState?.backgroundLocation
  // Opened from the menu: the page the user was on. Opened from a link or a refresh: their home
  // page, which is also where closing the pop-up will take them.
  const backgroundLocation = isProfileOpen && role ? (openedFrom ?? { pathname: roleHome[role] }) : null
  const displayedPathname = backgroundLocation?.pathname ?? location.pathname

  function changeProfileTab(tab: ProfileTab) {
    // replace, so Back leaves the pop-up rather than stepping through its tabs.
    navigate(tab === 'security' ? PROFILE_SECURITY_PATH : PROFILE_PATH, { replace: true, state: location.state })
  }

  function closeProfile() {
    if (openedFrom) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-bg-canvas">
      <ToastViewport />
      {/* On phones the language and theme controls drop to a second row: all of them in one row
          is wider than the screen, which pushed the profile button out of reach. */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-brand-forest/10 bg-bg-surface/80 px-4 py-3 backdrop-blur-md sm:flex-nowrap sm:px-6">
        <span className="mr-auto font-display text-xl text-brand-forest">{t('appName')}</span>

        <div className="order-last flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto sm:justify-end sm:gap-4">
          <LanguageSwitcher variant="compact" />
          <ThemeToggle variant="compact" />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Gated on the token, not on `user`: this layout also wraps the public
              marketplace browse route, and the bell polls GET /api/notifications/mine,
              which 401s for an anonymous visitor. */}
          {token && <NotificationBell />}
          {user && <ProfileMenu user={user} />}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-brand-forest/10 p-4 sm:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-brand-forest/10 hover:text-brand-forest',
                  isActive &&
                    'bg-brand-forest text-bg-surface hover:bg-brand-forest hover:text-bg-surface',
                )
              }
            >
              {item.icon}
              {t(item.labelKey)}
            </NavLink>
          ))}
        </aside>

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayedPathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* The pop-up's own route renders nothing; draw the page it sits over instead. */}
              {backgroundLocation ? renderMatches(matchRoutes(pageRoutes, backgroundLocation)) : <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ProfileDialog
        open={isProfileOpen}
        tab={isProfileSecurity ? 'security' : 'general'}
        onTabChange={changeProfileTab}
        onClose={closeProfile}
        user={user}
      />
    </div>
  )
}
