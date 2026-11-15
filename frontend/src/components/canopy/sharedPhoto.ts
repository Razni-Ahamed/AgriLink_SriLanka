import { useLayoutEffect, type RefObject } from 'react'
import { ease } from '@/lib/motion'

/**
 * "The photo grows into the page": a card's photo turns into the big photo at the top of the page
 * it opens, instead of the page simply appearing.
 *
 * The card remembers where its photo was on screen when tapped (`rememberPhoto`); the next page's
 * big photo starts at that spot and size, and slides and grows into place (`useGrowFromRemembered`,
 * a FLIP animation). It works across the route change and the lazily loaded page, which a single
 * component animation can't span. Skipped with motion off, or if the tap was long ago.
 */
let remembered: { key: string; rect: DOMRect; at: number } | null = null

const MAX_AGE_MS = 4000

export function rememberPhoto(key: string, element: Element | null) {
  if (!element) return
  remembered = { key, rect: element.getBoundingClientRect(), at: Date.now() }
}

export function useGrowFromRemembered(key: string, ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const from = remembered
    const element = ref.current
    remembered = null
    if (!from || !element || from.key !== key || Date.now() - from.at > MAX_AGE_MS) return
    if (document.documentElement.dataset.motion === 'off') return

    const to = element.getBoundingClientRect()
    if (!to.width || !to.height) return
    element.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${from.rect.left - to.left}px, ${from.rect.top - to.top}px) scale(${from.rect.width / to.width}, ${from.rect.height / to.height})`,
          borderRadius: '18px',
        },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: 520, easing: ease.out },
    )
  }, [key, ref])
}
