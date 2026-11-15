import { Suspense } from 'react'
import { motion } from 'motion/react'
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
import { MessagesButton } from '@/features/messages/components/MessagesButton'
import { ProfileDialog, type ProfileTab } from '@/features/account/components/ProfileDialog'
import { PROFILE_PATH, PROFILE_SECURITY_PATH } from '@/features/account/routes'
import { pageRoutes } from './pageRoutes'
import { NavTabs } from './NavTabs'
import { LogoutButton, ProfileButton } from './AccountButtons'
import { roleHome } from './roleHome'
import { PageLoading } from './RouteErrorPage'

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
    // No background of its own: the canvas color and its soft light come from <body> (index.css),
    // and the glass bars need that light behind them.
    <div className="min-h-screen">
      <ToastViewport />
      {/* Logo · tabs · controls. The two sides are flex-1 from a zero basis, so with room to
          spare they're equal and the tabs sit centred on the page; when space runs short neither
          shrinks below its content, so the smaller logo side gives way and the tabs drift left
          rather than anything overflowing. Below `xl` the admin's eight tabs, with names open,
          don't fit beside the controls, so the tabs move to the bottom bar. Language stays in
          the header for everyone, since it matters before anyone can read a menu; signed in,
          the theme setting moves to the profile pop-up.
          overflow-x-clip keeps any extreme case from scrolling the page sideways.
          The bar floats: a glass pill inset from the screen edges, with the page scrolling
          underneath it. */}
      <div className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
        <header className="glass-bar mx-auto flex max-w-7xl items-center gap-3 overflow-x-clip rounded-[22px] px-3 py-2 sm:rounded-full sm:px-4 xl:gap-6">
          {/* `/` sends a signed-in user to their role's home, and a visitor to the landing page. */}
          <div className="flex flex-1">
            <Link to="/" className="shrink-0">
              {/* On a phone the leaf alone, as on the landing page: the header's controls didn't fit
                beside the name on a 375px screen (the log-out button was cut off). */}
              <BrandMark nameClassName="max-sm:sr-only" />
            </Link>
          </div>

          {navItems.length > 0 ? (
            <NavTabs items={navItems} variant="top" className="hidden xl:block" />
          ) : null}

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 xl:gap-2">
            <LanguageCycleButton />
            {/* Signed in, the theme setting sits in the profile pop-up instead, which frees room
              on a phone's header. Visitors without a profile still get it here. */}
            {!token && <ThemeCycleButton />}
            {/* Gated on the token, not on `user`: this layout also wraps the public
              marketplace browse route, and the bell polls GET /api/notifications/mine,
              which 401s for an anonymous visitor. */}
            {token && <MessagesButton />}
            {token && <NotificationBell />}
            {user && <ProfileButton user={user} />}
            {token && <LogoutButton />}
          </div>
        </header>
      </div>

      {/* Phones and tablets have no hover and no room in the header, so the same tabs sit
          in a bar along the bottom of the screen, like a mobile app's: a floating glass pill,
          lifted clear of the phone's home indicator. */}
      {navItems.length > 0 && (
        <NavTabs
          items={navItems}
          variant="bottom"
          className="glass-bar fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 rounded-[26px] px-1 py-1.5 sm:inset-x-4 xl:hidden"
        />
      )}

      {/* min-w-0 lets the page shrink to the screen, and max-w keeps lines and cards at a readable
          width now that no sidebar takes up the side. The bottom padding clears the phone tab bar. */}
      <main
        className={cn(
          'mx-auto w-full max-w-7xl min-w-0 p-4 sm:p-6',
          navItems.length > 0 && 'pb-28 xl:pb-6',
        )}
      >
        {/* A new page arrives at once with a short fade, with no wait for the old one to fade
            out: each page has its own entrance (a photo settling, a card's photo growing into
            the page), and a page-wide exit would delay those and could strand a page mid-exit. */}
        <motion.div
          key={displayedPathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {/* Each page's code loads on first visit; the header and tabs stay put meanwhile. */}
          <Suspense fallback={<PageLoading />}>
            {/* The pop-up's own route renders nothing; draw the page it sits over instead. */}
            {backgroundLocation ? (
              renderMatches(matchRoutes(pageRoutes, backgroundLocation))
            ) : (
              <Outlet />
            )}
          </Suspense>
        </motion.div>
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
