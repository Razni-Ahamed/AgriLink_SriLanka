/**
 * The app's motion vocabulary, so every animation feels like the same material.
 *
 * Springs rather than fixed curves: a tap settles quickly, things that move overshoot a little and
 * land, the way a drop of water does. Only transform and opacity should be animated with these;
 * they stay smooth on cheap phones.
 */
export const spring = {
  /** Presses and toggles (~160 ms to settle). */
  tap: { type: 'spring', stiffness: 520, damping: 34 },
  /** A highlight or panel moving to a new place (~300 ms). */
  move: { type: 'spring', stiffness: 380, damping: 30 },
  /** A photo growing into a page, a sheet rising (~450 ms). */
  reveal: { type: 'spring', stiffness: 240, damping: 28 },
} as const

/** For CSS and the Web Animations API, which take curves rather than springs. */
export const ease = {
  /** Slight overshoot, the CSS stand-in for `spring.move`. */
  springy: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
  out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const

/** How much a pressed button shrinks. */
export const PRESS_SCALE = 0.96
