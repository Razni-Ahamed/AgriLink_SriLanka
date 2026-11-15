import { useEffect, useRef } from 'react'

interface GlassLensProps {
  /** The same image the parent shows full-size with `object-fit: cover`. */
  src: string
  /** The image's own size, to work out where `cover` placed it. */
  naturalWidth: number
  naturalHeight: number
  /** How much closer the lens looks. */
  magnify?: number
}

/**
 * A round glass lens over a hero photo. It follows the pointer and shows the photo closer and
 * clearer underneath it (the darkening scrim doesn't reach inside), stretching a little in the
 * direction it moves, like a drop of water. With nothing to follow it drifts slowly by itself.
 *
 * It is a magnified copy of the photo moved with transforms, not a browser filter, so it works in
 * every browser. Place it inside the photo's positioned container, above the scrim and below the
 * text. Lite motion: follows the pointer but doesn't drift; motion off: hidden.
 */
export function GlassLens({ src, naturalWidth, naturalHeight, magnify = 1.55 }: GlassLensProps) {
  const lensRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lens = lensRef.current
    const image = imageRef.current
    const host = lens?.parentElement
    if (!lens || !image || !host) return

    const level = () => document.documentElement.dataset.motion ?? 'full'
    let x = host.clientWidth * 0.7
    let y = host.clientHeight * 0.55
    let targetX = x
    let targetY = y
    let inside = false
    let visible = true
    let frame = 0
    const started = performance.now()

    function radius() {
      return Math.round(Math.max(56, Math.min(100, host!.clientWidth * 0.085)))
    }

    function draw(vx: number, vy: number) {
      const w = host!.clientWidth
      const h = host!.clientHeight
      const r = radius()
      const scale = Math.max(w / naturalWidth, h / naturalHeight)
      const coverW = naturalWidth * scale
      const coverH = naturalHeight * scale
      const u = (x - (w - coverW) / 2) / coverW
      const v = (y - (h - coverH) / 2) / coverH

      lens!.style.width = lens!.style.height = `${2 * r}px`
      image!.style.backgroundSize = `${coverW * magnify}px ${coverH * magnify}px`
      image!.style.backgroundPosition = `${r - u * coverW * magnify}px ${r - v * coverH * magnify}px`

      const speed = Math.hypot(vx, vy)
      const stretch = level() === 'full' ? Math.min(speed / 55, 0.16) : 0
      const angle = Math.atan2(vy, vx)
      lens!.style.transform = `translate(${x - r}px, ${y - r}px) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.7}) rotate(${-angle}rad)`
    }

    function tick(now: number) {
      frame = 0
      if (level() === 'off') {
        lens!.hidden = true
        return
      }
      lens!.hidden = false
      if (!inside) {
        if (level() !== 'full') {
          draw(0, 0)
          return
        }
        const t = (now - started) / 1000
        targetX = host!.clientWidth * (0.68 + 0.15 * Math.sin(t * 0.33))
        targetY = host!.clientHeight * (0.55 + 0.2 * Math.sin(t * 0.47 + 1))
      }
      const nextX = x + (targetX - x) * 0.12
      const nextY = y + (targetY - y) * 0.12
      const vx = nextX - x
      const vy = nextY - y
      x = nextX
      y = nextY
      draw(vx, vy)
      if (visible && (inside || level() === 'full')) frame = requestAnimationFrame(tick)
    }

    function start() {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      const rect = host!.getBoundingClientRect()
      targetX = event.clientX - rect.left
      targetY = event.clientY - rect.top
      inside = true
      start()
    }
    function onLeave() {
      inside = false
      start()
    }

    // Only animate while the hero is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    observer.observe(host)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    start()

    return () => {
      observer.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [naturalWidth, naturalHeight, magnify])

  return (
    <div
      ref={lensRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-[1] overflow-hidden rounded-full will-change-transform"
      style={{
        boxShadow:
          'inset 0 0 0 1.5px rgb(255 255 255 / 0.55), inset 0 10px 22px rgb(255 255 255 / 0.35), inset 0 -14px 26px rgb(0 0 0 / 0.35), 0 18px 40px -12px rgb(0 0 0 / 0.6)',
      }}
    >
      <div
        ref={imageRef}
        className="absolute inset-0 -z-10 bg-no-repeat"
        style={{ backgroundImage: `url("${src}")`, filter: 'saturate(1.25) contrast(1.05)' }}
      />
      {/* The highlight on the glass and its bright rim. */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(60%_40%_at_32%_18%,rgb(255_255_255/0.45),transparent_70%),radial-gradient(closest-side,transparent_78%,rgb(255_255_255/0.22)_94%,transparent_100%)]" />
    </div>
  )
}
