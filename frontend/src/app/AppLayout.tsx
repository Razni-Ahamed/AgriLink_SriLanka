import { AnimatePresence, motion } from 'motion/react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import { getNavItemsForRole } from './navConfig'
import { cn } from '@/lib/utils'
import { ToastViewport } from '@/components/ui/Toast'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navItems = getNavItemsForRole(role)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg-canvas">
      <ToastViewport />
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-brand-forest/10 bg-bg-surface/80 px-6 py-3 backdrop-blur-md">
        <span className="font-display text-xl text-brand-forest">AgriLink</span>

        <div className="flex items-center gap-4">
          {/* NotificationBell slot — Jinathi wires this in */}
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-text-secondary">{user.fullName}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl px-3 py-1.5 text-brand-forest hover:bg-brand-forest/10"
              >
                Log out
              </button>
            </div>
          )}
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
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
