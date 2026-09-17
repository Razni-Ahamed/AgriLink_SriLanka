import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { approveRegistration, getPendingRegistrations, rejectRegistration } from './registrationsApi'

vi.mock('@/lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

describe('registrationsApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('getPendingRegistrations fetches the pending queue', async () => {
    get.mockResolvedValue({ data: [] })

    await getPendingRegistrations()

    expect(get).toHaveBeenCalledWith('/api/registrations/pending')
  })

  it('approveRegistration posts to the approve endpoint for that user', async () => {
    post.mockResolvedValue({ data: {} })

    await approveRegistration(42)

    expect(post).toHaveBeenCalledWith('/api/registrations/42/approve')
  })

  it('rejectRegistration posts the reason to the reject endpoint', async () => {
    post.mockResolvedValue({ data: {} })

    await rejectRegistration(42, { reason: 'NIC mismatch' })

    expect(post).toHaveBeenCalledWith('/api/registrations/42/reject', { reason: 'NIC mismatch' })
  })
})
