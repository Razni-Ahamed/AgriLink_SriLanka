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
