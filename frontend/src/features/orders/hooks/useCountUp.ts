import { useEffect, useRef, useState } from 'react'

/** Animates from 0 to `target` once, on mount / whenever `target` changes. */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1)
      setValue(Math.round(target * progress))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [target, durationMs])

  return value
}
