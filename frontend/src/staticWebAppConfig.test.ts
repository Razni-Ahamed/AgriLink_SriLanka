/// <reference types="node" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const config = JSON.parse(read('../public/staticwebapp.config.json')) as {
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

  it('sends the other protective headers', () => {
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff')
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY')
    expect(config.globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })
})
