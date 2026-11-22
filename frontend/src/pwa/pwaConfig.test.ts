/// <reference types="node" />
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pwaOptions } from '../../pwa.config'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../public')
const publicFile = (name: string) => existsSync(join(publicDir, name))

describe('installable app settings', () => {
  const manifest = pwaOptions.manifest || {}

  it('installs as a standalone app that opens at the home page', () => {
    expect(manifest.name).toBe('AgriLink Sri Lanka')
    expect(manifest.short_name).toBe('AgriLink')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('has the icon sizes Android needs, including a maskable one, and they exist', () => {
    const icons = manifest.icons ?? []
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    for (const icon of icons) {
      expect(publicFile(icon.src), icon.src).toBe(true)
    }
  })

  it('asks before switching to a new version instead of reloading mid-form', () => {
    expect(pwaOptions.registerType).toBe('prompt')
    expect(pwaOptions.injectRegister).toBe(false)
  })

  it('precaches every code chunk but no photos or fonts up front', () => {
    const patterns = pwaOptions.injectManifest?.globPatterns ?? []
    expect(patterns.join(' ')).not.toMatch(/webp|jpg|woff/)
    expect(patterns).toContain('**/*.{js,css,html}')
    // A chunk left out (the admin dashboard was) would be fetched from the network by an older
    // version still open in a tab, after the deploy that replaced it removed the file.
    expect(pwaOptions.injectManifest?.globIgnores ?? []).toEqual([])
  })
})
