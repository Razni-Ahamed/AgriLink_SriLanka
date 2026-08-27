import { describe, expect, it } from 'vitest'
import { roleHome } from './roleHome'

describe('roleHome', () => {
  it('maps every role to a route', () => {
    expect(roleHome.Farmer).toBe('/farms')
    expect(roleHome.Officer).toBe('/issues/pending')
    expect(roleHome.Buyer).toBe('/marketplace/browse')
    expect(roleHome.Admin).toBe('/admin')
  })
})
