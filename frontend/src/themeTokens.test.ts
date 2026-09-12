/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk rather than importing: @tailwindcss/vite compiles this
// stylesheet on the way through Vite (even via `?raw`), which rewrites `@theme`
// away — and the authored source is exactly what this test checks. Resolved
// from cwd because jsdom reports import.meta.url as an http URL.
//
// The node reference above is file-local on purpose: tsconfig.app.json pins
// `types` to vite/client, and app code has no business reaching for node.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/** Pull the `--color-*` declarations out of one top-level block. */
function colorTokensIn(blockSelector: string): Record<string, string> {
  const start = css.indexOf(blockSelector)
  expect(start, `${blockSelector} block not found in index.css`).toBeGreaterThan(-1)

  const open = css.indexOf('{', start)
  const end = css.indexOf('\n}', open)
  const body = css.slice(open, end)

  const tokens: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = value.trim()
  }
  return tokens
}

describe('theme tokens', () => {
  const light = colorTokensIn('@theme {')
  const dark = colorTokensIn('.dark {')

  it('finds both palettes', () => {
    expect(Object.keys(light).length).toBeGreaterThan(5)
    expect(Object.keys(dark).length).toBeGreaterThan(5)
  })

  it('overrides every light token in dark mode', () => {
    // Every color in the app resolves through these tokens, so one missing from
    // `.dark` silently keeps its light value — near-black text on a dark canvas.
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort())
  })

  it('gives each token a genuinely different dark value', () => {
    const identical = Object.keys(light).filter((name) => light[name] === dark[name])
    expect(identical).toEqual([])
  })
})
