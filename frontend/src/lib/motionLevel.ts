/**
 * How much the interface moves.
 *
 *   full  glass, springs, the pointer highlight and the slow background loops
 *   lite  no blur and no background loops: solid panels that are cheap to draw on slow phones
 *   off   nothing moves (what people with "reduce motion" switched on get)
 *
 * `system` is the default: off when the device asks for reduced motion, lite when the browser
 * asks to save data, full otherwise. The resolved level is put on <html> as `data-motion`, which
 * index.css reads; a pre-paint script in index.html does the same before the bundle loads.
 */
export const MOTION_PREFERENCES = ['system', 'full', 'lite', 'off'] as const

export type MotionPreference = (typeof MOTION_PREFERENCES)[number]
export type MotionLevel = Exclude<MotionPreference, 'system'>

export const DEFAULT_MOTION_PREFERENCE: MotionPreference = 'system'
export const MOTION_STORAGE_KEY = 'agrilink.motion'
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function isMotionPreference(value: unknown): value is MotionPreference {
  return MOTION_PREFERENCES.includes(value as MotionPreference)
}

export function readStoredMotionPreference(): MotionPreference {
  try {
    const stored = localStorage.getItem(MOTION_STORAGE_KEY)
    return isMotionPreference(stored) ? stored : DEFAULT_MOTION_PREFERENCE
  } catch {
    return DEFAULT_MOTION_PREFERENCE
  }
}

export function writeStoredMotionPreference(preference: MotionPreference): void {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, preference)
  } catch {
    // localStorage unavailable: the choice just won't survive a reload
  }
}

/** Guarded because jsdom and older browsers lack matchMedia and the Network Information API. */
export function getSystemMotionLevel(): MotionLevel {
  try {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return 'off'
  } catch {
    // no matchMedia: fall through
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData ? 'lite' : 'full'
}

export function resolveMotionLevel(preference: MotionPreference): MotionLevel {
  return preference === 'system' ? getSystemMotionLevel() : preference
}

export function applyMotionLevel(level: MotionLevel): void {
  document.documentElement.dataset.motion = level
}

/** Calls `onChange` when the device's reduced-motion setting flips. Returns a cleanup. */
export function subscribeToSystemMotion(onChange: (level: MotionLevel) => void): () => void {
  let query: MediaQueryList
  try {
    query = window.matchMedia(REDUCED_MOTION_QUERY)
  } catch {
    return () => {}
  }
  const listener = () => onChange(getSystemMotionLevel())
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }
  query.addListener?.(listener)
  return () => query.removeListener?.(listener)
}
