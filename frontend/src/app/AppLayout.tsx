import { AnimatePresence, motion } from 'motion/react'
import {
  Link,
  Outlet,
  matchRoutes,
  renderMatches,
  useLocation,
  useMatch,
  useNavigate,
  type Location,
} from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import { cn } from '@/lib/utils'
import { getNavItemsForRole } from './navConfig'
import { BrandMark } from '@/components/ui/BrandMark'
import { LanguageCycleButton, ThemeCycleButton } from '@/components/ui/PreferenceCycleButtons'
import { ToastViewport } from '@/components/ui/Toast'
import { NotificationBell } from '@/features/orders/components/NotificationBell'
import { ProfileDialog, type ProfileTab } from '@/features/account/components/ProfileDialog'
import { PROFILE_PATH, PROFILE_SECURITY_PATH } from '@/features/account/routes'
import { pageRoutes } from './pageRoutes'
import { NavTabs } from './NavTabs'
import { LogoutButton, ProfileButton } from './AccountButtons'
import { roleHome } from './roleHome'

interface ProfileRouteState {
  /** Where the user was when they opened the pop-up; that page stays visible behind it. */
  backgroundLocation?: Location
}

export function AppLayout() {
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
  const backgroundLocation =
    isProfileOpen && role ? (openedFrom ?? { pathname: roleHome[role] }) : null
  const displayedPathname = backgroundLocation?.pathname ?? location.pathname

  function changeProfileTab(tab: ProfileTab) {
    // replace, so Back leaves the pop-up rather than stepping through its tabs.
    navigate(tab === 'security' ? PROFILE_SECURITY_PATH : PROFILE_PATH, {
      replace: true,
      state: location.state,
    })
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
      {/* Logo · tabs · controls. The two sides are flex-1 from a zero basis, so with room to
          spare they're equal and the tabs sit centred on the page; when space runs short neither
          shrinks below its content, so the smaller logo side gives way and the tabs drift left
          rather than anything overflowing. Below `xl` the admin's eight tabs, with names open,
          don't fit beside the controls, so the tabs move to the bottom bar. Language and theme
          stay in the header for everyone, since both matter before anyone finds a menu.
          overflow-x-clip keeps any extreme case from scrolling the page sideways. */}
      <header className="sticky top-0 z-40 flex items-center gap-3 overflow-x-clip border-b border-brand-forest/10 bg-bg-surface/80 px-4 py-2.5 backdrop-blur-md sm:px-6 xl:gap-6">
        {/* `/` sends a signed-in user to their role's home, and a visitor to the landing page. */}
        <div className="flex flex-1">
          <Link to="/" className="shrink-0">
            <BrandMark />
          </Link>
        </div>

        {navItems.length > 0 ? (
          <NavTabs items={navItems} variant="top" className="hidden xl:block" />
        ) : null}

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 xl:gap-2">
          <LanguageCycleButton />
          <ThemeCycleButton />
          {/* Gated on the token, not on `user`: this layout also wraps the public
              marketplace browse route, and the bell polls GET /api/notifications/mine,
              which 401s for an anonymous visitor. */}
          {token && <NotificationBell />}
          {user && <ProfileButton user={user} />}
          {token && <LogoutButton />}
        </div>
      </header>

      {/* Phones and tablets have no hover and no room in the header, so the same tabs sit
          in a bar along the bottom of the screen, like a mobile app's. */}
      {navItems.length > 0 && (
        <NavTabs
          items={navItems}
          variant="bottom"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-forest/10 bg-bg-surface/85 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md xl:hidden"
        />
      )}

      {/* min-w-0 lets the page shrink to the screen, and max-w keeps lines and cards at a readable
          width now that no sidebar takes up the side. The bottom padding clears the phone tab bar. */}
      <main
        className={cn(
          'mx-auto w-full max-w-7xl min-w-0 p-4 sm:p-6',
          navItems.length > 0 && 'pb-24 xl:pb-6',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={displayedPathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* The pop-up's own route renders nothing; draw the page it sits over instead. */}
            {backgroundLocation ? (
              renderMatches(matchRoutes(pageRoutes, backgroundLocation))
            ) : (
              <Outlet />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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
