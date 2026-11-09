import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Libraries every page needs, in their own file: a deploy that changes only the app's
              // code leaves this file's name unchanged, so returning visitors keep it cached.
              // Page-specific libraries (recharts, on the admin dashboard) stay with their page.
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run|@tanstack|axios|i18next|react-i18next|zustand|motion|motion-dom|motion-utils|framer-motion)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // src/lib/env.ts refuses to start without an API address, and anything importing the API client
    // loads it. Tests never reach a real API, so give them one here rather than depending on a
    // developer's gitignored .env — CI has none, and those suites crashed on import there.
    env: {
      VITE_API_BASE_URL: 'http://localhost:5266',
    },
  },
})
