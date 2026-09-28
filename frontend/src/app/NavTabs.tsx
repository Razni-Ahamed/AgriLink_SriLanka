import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { NavItem } from '@/types/common'
import { cn } from '@/lib/utils'

interface NavTabsProps {
  items: NavItem[]
  /**
   * `top` sits in the header on wider screens: icons, with the current tab's name always showing
   * and any other tab's sliding out on hover or keyboard focus. `bottom` is the phone tab bar,
   * icons only, where there's no hover and no room for names.
   */
  variant: 'top' | 'bottom'
  className?: string
}

const pillTransition = { type: 'spring', stiffness: 380, damping: 32 } as const

/** The role's pages as tabs, with a glass highlight that glides to whichever one is open. */
export function NavTabs({ items, variant, className }: NavTabsProps) {
  const { t } = useTranslation()
  // Scoped, so the top and bottom bars (or any two mounted at once) never animate into each other.
  const pillId = useId()
  // With "reduce motion" on, the highlight and names appear at once instead of sliding.
  const reduceMotion = useReducedMotion()

  return (
    <nav aria-label={t('nav.menu')} className={className}>
      <ul
        className={cn(
          'flex items-center',
          variant === 'top'
            ? 'gap-2 rounded-2xl border border-brand-forest/10 bg-brand-forest/[0.04] p-1.5'
            : 'justify-around gap-1 px-2',
        )}
      >
        {items.map((item) => {
          const label = t(item.labelKey)
          // A tab whose path starts another tab's (the admin's /admin and /admin/users) is only
          // current on its own page, so exactly one tab is ever highlighted.
          const end = items.some((other) => other.path.startsWith(`${item.path}/`))

          return (
            <li
              key={item.path}
              className={variant === 'bottom' ? 'flex flex-1 justify-center' : undefined}
            >
              <NavLink
                to={item.path}
                end={end}
                title={variant === 'bottom' ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-xl text-sm font-medium transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60',
                    variant === 'top' ? 'h-10 px-3' : 'h-11 w-full max-w-16 justify-center',
                    isActive
                      ? 'text-brand-forest'
                      : 'text-text-secondary hover:bg-brand-forest/[0.07] hover:text-brand-forest',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId={pillId}
                        transition={reduceMotion ? { duration: 0 } : pillTransition}
                        className="glass-pill absolute inset-0 rounded-xl"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        'relative flex shrink-0',
                        variant === 'top' ? '[&_svg]:size-[22px]' : '[&_svg]:size-[20px]',
                      )}
                    >
                      {item.icon}
                    </span>
                    {variant === 'top' ? (
                      // Slides open by animating the grid column from 0fr to 1fr, which reaches
                      // the name's natural width without measuring it. The name stays in the
                      // accessibility tree while closed, so screen readers always hear it.
                      // A name is capped (with "…"): the longest Tamil ones, two open at once,
                      // would otherwise push the centred header past a laptop screen.
                      <span
                        className={cn(
                          'relative grid transition-[grid-template-columns,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
                          isActive
                            ? 'ml-2 grid-cols-[1fr] opacity-100'
                            : 'ml-0 grid-cols-[0fr] opacity-0 group-hover:ml-2 group-hover:grid-cols-[1fr] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:grid-cols-[1fr] group-focus-visible:opacity-100',
                        )}
                      >
                        <span className="max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                          {label}
                        </span>
                      </span>
                    ) : (
                      <span className="sr-only">{label}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
