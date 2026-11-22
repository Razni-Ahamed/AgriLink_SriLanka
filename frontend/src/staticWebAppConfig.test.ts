/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const config = JSON.parse(read('../public/staticwebapp.config.json')) as {
  navigationFallback: { exclude: string[] }
  routes: { route: string; headers?: Record<string, string> }[]
  mimeTypes?: Record<string, string>
  globalHeaders: Record<string, string>
}
const csp = config.globalHeaders['Content-Security-Policy']

/**
 * The site's Content-Security-Policy allows exactly one inline script, index.html's theme script,
 * by its hash. Any edit to that script changes the hash, and the browser would then silently skip
 * it (a flash of the light theme for dark-mode users) — so this fails first.
 */
describe('staticwebapp.config.json', () => {
  it("allows index.html's inline theme script by its exact hash", () => {
    const inlineScripts = [...read('../index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)]
    expect(inlineScripts).toHaveLength(1)
    const hash = createHash('sha256').update(inlineScripts[0][1], 'utf8').digest('base64')

    expect(csp).toContain(`'sha256-${hash}'`)
  })

  it('lets the site reach the API and its photo hosts, and nothing else', () => {
    expect(csp).toContain("connect-src 'self' https://agrilink-api-sl.azurewebsites.net;")
    expect(csp).toContain('https://res.cloudinary.com')
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })

  it('serves fonts from the site itself, not Google Fonts', () => {
    expect(csp).toContain("font-src 'self';")
    expect(csp).not.toContain('fonts.googleapis.com')
    expect(read('../index.html')).not.toContain('fonts.googleapis.com')
  })

  it('sends the other protective headers', () => {
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff')
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY')
    expect(config.globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('keeps hashed files cached for a year and lets browsers check for a new service worker', () => {
    const headers = (route: string) => config.routes.find((entry) => entry.route === route)?.headers
    expect(headers('/assets/*')?.['Cache-Control']).toBe('public, max-age=31536000, immutable')
    expect(headers('/sw.js')?.['Cache-Control']).toBe('no-cache')
    expect(headers('/manifest.webmanifest')?.['Cache-Control']).toBe('no-cache')
  })

  it('serves the web app manifest as itself, not as index.html', () => {
    expect(config.mimeTypes?.['.webmanifest']).toBe('application/manifest+json')
    expect(config.navigationFallback.exclude.join(' ')).toContain('webmanifest')
  })
})
