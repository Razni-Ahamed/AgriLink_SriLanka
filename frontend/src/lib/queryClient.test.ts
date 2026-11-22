import { describe, expect, it } from 'vitest'
import { queryClient } from './queryClient'

describe('query network modes', () => {
  it('tries saved-for-offline queries without a signal, so the service worker can answer them', () => {
    for (const key of [
      ['harvests', 'page', {}, 1, 24],
      ['orders', 'mine', 1],
      ['issues', 'mine', 1],
    ]) {
      expect(queryClient.getQueryDefaults(key).networkMode, JSON.stringify(key)).toBe(
        'offlineFirst',
      )
    }
  })

  it('pauses everything else offline instead of failing it', () => {
    for (const key of [
      ['notifications', 'unread-count'],
      ['conversations', 'list'],
      ['issues', 'pending', 1],
    ]) {
      expect(queryClient.getQueryDefaults(key).networkMode, JSON.stringify(key)).toBeUndefined()
    }
  })
})
