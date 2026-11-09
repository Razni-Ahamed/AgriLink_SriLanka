import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DotsThreeOutline } from '@phosphor-icons/react'
import type { NavItem } from '@/types/common'
import { cn } from '@/lib/utils'

interface NavTabsProps {
  items: NavItem[]
  /**
   * `top` sits in the header on wide screens: icon and name for every tab, unless the role has so
   * many that the names wouldn't fit beside the header's buttons (the admin's eight), in which
   * case only the current tab's name shows and the others open on hover or keyboard focus.
   * `bottom` is the phone and tablet tab bar: a name under every icon, with any tabs past
   * {@link BOTTOM_TAB_LIMIT} gathered under "More".
   */
  variant: 'top' | 'bottom'
  className?: string
}

/** Most names fit on a laptop header up to this many tabs, even in Tamil. */
const TOP_ALWAYS_NAMED_LIMIT = 6
/** Five tabs is the most a 375px phone fits with readable names; the fifth becomes "More". */
const BOTTOM_TAB_LIMIT = 5

const pillTransition = { type: 'spring', stiffness: 380, damping: 32 } as const

/** Whether an item is the open page, by the same rule NavLink uses for its highlight. */
function isCurrent(item: NavItem, items: NavItem[], pathname: string) {
  const end = items.some((other) => other.path.startsWith(`${item.path}/`))
  return matchPath({ path: item.path, end }, pathname) !== null
}

/** The role's pages as tabs, with a glass highlight that glides to whichever one is open. */
export function NavTabs({ items, variant, className }: NavTabsProps) {
  const { t } = useTranslation()
  // Scoped, so the top and bottom bars (or any two mounted at once) never animate into each other.
  const pillId = useId()
  // With "reduce motion" on, the highlight and names appear at once instead of sliding.
  const reduceMotion = useReducedMotion()

  const overflows = variant === 'bottom' && items.length > BOTTOM_TAB_LIMIT
  const shown = overflows ? items.slice(0, BOTTOM_TAB_LIMIT - 1) : items
  const hidden = overflows ? items.slice(BOTTOM_TAB_LIMIT - 1) : []
  const alwaysNamed = variant === 'bottom' || items.length <= TOP_ALWAYS_NAMED_LIMIT

  return (
    <nav aria-label={t('nav.menu')} className={className}>
      <ul
        className={cn(
          'flex items-center',
          variant === 'top'
            ? 'gap-2 rounded-2xl border border-brand-forest/10 bg-brand-forest/[0.04] p-1.5'
            : 'justify-around gap-0.5 px-1',
        )}
      >
        {shown.map((item) => {
          const label = t(item.labelKey)
          // A tab whose path starts another tab's (the admin's /admin and /admin/users) is only
          // current on its own page, so exactly one tab is ever highlighted.
          const end = items.some((other) => other.path.startsWith(`${item.path}/`))

          return (
            <li
              key={item.path}
              className={variant === 'bottom' ? 'flex min-w-0 flex-1 justify-center' : undefined}
            >
              <NavLink
                to={item.path}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-xl font-medium transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60',
                    variant === 'top'
                      ? 'h-10 px-3 text-sm'
                      : 'min-h-12 w-full max-w-24 flex-col justify-center gap-0.5 px-0.5 py-1 text-[11px] leading-tight',
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
                    {variant === 'bottom' ? (
                      // Two lines at most, so a long Sinhala or Tamil name wraps instead of
                      // being cut to a few letters.
                      <span className="relative line-clamp-2 w-full text-center break-words">
                        {label}
                      </span>
                    ) : alwaysNamed ? (
                      <span className="relative ml-2 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                        {label}
                      </span>
                    ) : (
                      // Slides open by animating the grid column from 0fr to 1fr, which reaches
                      // the name's natural width without measuring it. The name stays in the
                      // accessibility tree while closed, so screen readers always hear it.
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
                    )}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}

        {hidden.length > 0 && (
          <li className="flex min-w-0 flex-1 justify-center">
            <MoreMenu items={hidden} allItems={items} pillId={pillId} />
          </li>
        )}
      </ul>
    </nav>
  )
}

/** The bottom bar's last tab: the role's remaining pages in a small menu above the bar. */
function MoreMenu({
  items,
  allItems,
  pillId,
}: {
  items: NavItem[]
  allItems: NavItem[]
  pillId: string
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  // Remembers the page it was opened on, so picking a page (a new pathname) closes it by itself.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (value: boolean | ((current: boolean) => boolean)) =>
    setOpenOn((typeof value === 'function' ? value(open) : value) ? pathname : null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const active = items.some((item) => isCurrent(item, allItems, pathname))

  // Close on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenOn(null)
    }
    function onPointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex w-full max-w-24 justify-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[11px] leading-tight font-medium transition-colors',
          'outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60',
          active || open
            ? 'text-brand-forest'
            : 'text-text-secondary hover:bg-brand-forest/[0.07] hover:text-brand-forest',
        )}
      >
        {active && (
          <motion.span
            layoutId={pillId}
            transition={reduceMotion ? { duration: 0 } : pillTransition}
            className="glass-pill absolute inset-0 rounded-xl"
            aria-hidden="true"
          />
        )}
        <DotsThreeOutline size={20} weight="duotone" className="relative" aria-hidden="true" />
        <span className="relative">{t('nav.more')}</span>
      </button>

      {open && (
        <ul
          id={menuId}
          className="absolute right-0 bottom-full mb-2 flex w-56 flex-col gap-1 rounded-2xl border border-brand-forest/10 bg-bg-surface p-1.5 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={allItems.some((other) => other.path.startsWith(`${item.path}/`))}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors [&_svg]:size-[20px]',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60',
                    isActive
                      ? 'bg-brand-forest/10 text-brand-forest'
                      : 'text-text-primary hover:bg-brand-forest/[0.07]',
                  )
                }
              >
                {item.icon}
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
