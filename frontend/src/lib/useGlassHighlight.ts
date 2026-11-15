import { useEffect } from 'react'

const GLASS_SELECTOR = '.glass, .glass-bar'

/**
 * Moves the soft highlight on every glass panel toward the pointer, the way light slides over
 * real glass as you move. Mount once, near the root.
 *
 * One passive listener for the whole page, batched to one update per frame, and only panels that
 * are on screen are touched. Does nothing unless the motion level is `full`, and does nothing on
 * touch screens (there is no pointer to follow).
 */
export function useGlassHighlight(): void {
  useEffect(() => {
    let frame = 0
    let x = 0
    let y = 0

    function update() {
      frame = 0
      const viewportHeight = window.innerHeight
      for (const element of document.querySelectorAll<HTMLElement>(GLASS_SELECTOR)) {
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.bottom < 0 || rect.top > viewportHeight) continue
        element.style.setProperty('--glass-x', `${x - rect.left}px`)
        element.style.setProperty('--glass-y', `${y - rect.top}px`)
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      if (document.documentElement.dataset.motion !== 'full') return
      x = event.clientX
      y = event.clientY
      if (!frame) frame = requestAnimationFrame(update)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
