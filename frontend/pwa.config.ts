import type { VitePWAOptions } from 'vite-plugin-pwa'

/**
 * The installable, offline-capable app: web app manifest, icons and the service worker
 * (src/sw/sw.ts). Kept out of vite.config.ts so a test can check it without starting Vite.
 */
export const pwaOptions: Partial<VitePWAOptions> = {
  strategies: 'injectManifest',
  srcDir: 'src/sw',
  filename: 'sw.ts',
  // The page registers the worker itself (src/pwa/UpdatePrompt.tsx), so updates wait for the user.
  registerType: 'prompt',
  injectRegister: false,
  injectManifest: {
    // The app's code only. Photos and fonts are cached as they are first shown (see sw.ts), so
    // installing doesn't download every crop photo or the Sinhala and Tamil fonts for everyone.
    globPatterns: ['**/*.{js,css,html}', 'favicon.svg', 'pwa-192.png'],
    // The admin dashboard's charts (about 100 KB) are for one office user on a good connection.
    globIgnores: ['**/AdminDashboardPage-*.js'],
  },
  includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
  // Browsers fetch the large install icons while online, when installing; no need to keep them.
  includeManifestIcons: false,
  manifest: {
    id: '/',
    name: 'AgriLink Sri Lanka',
    short_name: 'AgriLink',
    description:
      'Sell harvests, buy produce and get crop advice from agricultural officers across Sri Lanka.',
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The light canvas (--color-bg-canvas in index.css) and the brand green.
    background_color: '#eef2e8',
    theme_color: '#2e7d4f',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  devOptions: { enabled: false },
}
