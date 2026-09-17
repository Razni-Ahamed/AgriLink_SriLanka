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
