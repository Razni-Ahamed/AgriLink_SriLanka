import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * A page that loads its code only when someone first opens it, so the first visit downloads the
 * shell rather than every role's screens. Pages are named exports, which React.lazy can't take
 * directly, hence the `name`:
 *
 *   const FarmsListPage = lazyPage(() => import('./pages/FarmsListPage'), 'FarmsListPage')
 *
 * Render it inside a <Suspense> (AppLayout and App each have one).
 */
export function lazyPage<Name extends string, Module extends Record<Name, ComponentType<object>>>(
  load: () => Promise<Module>,
  name: Name,
): LazyExoticComponent<Module[Name]> {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const RELOADED_AT_KEY = 'agrilink.chunkReloadAt'
const RELOAD_COOLDOWN_MS = 10_000

/**
 * A new deploy replaces every chunk file, so a tab opened before it asks for page code that no
 * longer exists. Vite reports that as `vite:preloadError`; reloading fetches the new index.html
 * and its chunks. The cooldown stops a reload loop when the real cause is a dropped connection —
 * then the route's error page offers "Try again" instead.
 */
export function reloadOnStaleChunks(target: Window = window): void {
  target.addEventListener('vite:preloadError', (event) => {
    const now = Date.now()
    let last = 0
    try {
      last = Number(target.sessionStorage.getItem(RELOADED_AT_KEY) ?? 0)
      target.sessionStorage.setItem(RELOADED_AT_KEY, String(now))
    } catch {
      // Storage blocked: still reload once; the error page covers a repeat failure.
    }
    if (now - last > RELOAD_COOLDOWN_MS) {
      event.preventDefault()
      target.location.reload()
    }
  })
}
