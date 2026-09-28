import '@testing-library/jest-dom'

// jsdom doesn't implement matchMedia, which the theme layer uses to resolve the
// `system` preference. Default to light; tests that care drive it themselves
// via `mockSystemTheme` in themeStorage.test.ts.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// Nor IntersectionObserver, which motion's `whileInView` (the home page's scroll-in fades) and the
// home page's scroll story rely on. This one never reports anything in view; the content is in
// the DOM regardless, which is what tests look at.
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  class NoopIntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof window.IntersectionObserver
}
