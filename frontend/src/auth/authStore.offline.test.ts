import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSavedApiData } from '@/pwa/offlineData'
import { tokenUserId, useAuthStore } from './authStore'

vi.mock('@/pwa/offlineData', () => ({ clearSavedApiData: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./api', () => ({ getCurrentUser: vi.fn().mockReturnValue(new Promise(() => {})) }))

const token = (claims: object) => `header.${btoa(JSON.stringify(claims))}.signature`

describe('tokenUserId', () => {
  it("reads the token's subject", () => {
    expect(tokenUserId(token({ sub: '42', exp: 9_999_999_999 }))).toBe('42')
  })

  it('is null for a token without one, or one that cannot be read', () => {
    expect(tokenUserId(token({ exp: 9_999_999_999 }))).toBeNull()
    expect(tokenUserId('not-a-token')).toBeNull()
  })
})

describe('offline data and sessions', () => {
  beforeEach(() => {
    vi.mocked(clearSavedApiData).mockClear()
    localStorage.clear()
  })

  it("clears saved listings and orders when someone signs in, so they never see the last person's", () => {
    useAuthStore.getState().login(token({ sub: '1', exp: 9_999_999_999 }), 'Farmer')
    expect(clearSavedApiData).toHaveBeenCalledTimes(1)
  })

  it('clears them again on sign-out', () => {
    useAuthStore.getState().login(token({ sub: '1', exp: 9_999_999_999 }), 'Farmer')
    vi.mocked(clearSavedApiData).mockClear()

    useAuthStore.getState().logout()

    expect(clearSavedApiData).toHaveBeenCalledTimes(1)
  })

  it('clears them when an expired session is dropped at start-up', () => {
    localStorage.setItem(
      'agrilink.auth',
      JSON.stringify({ token: token({ sub: '1', exp: 1 }), role: 'Farmer' }),
    )

    useAuthStore.getState().hydrate()

    expect(clearSavedApiData).toHaveBeenCalledTimes(1)
  })
})
