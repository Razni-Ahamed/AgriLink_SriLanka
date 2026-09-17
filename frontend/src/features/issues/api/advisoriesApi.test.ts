import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { approveAdvisory, rejectAdvisory } from './advisoriesApi'

vi.mock('@/lib/apiClient', () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }))

const post = vi.mocked(apiClient.post)

describe('advisory review requests', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: {} })
  })

  it("sends a confirmation's treatment and note", async () => {
    await approveAdvisory(4, {
      note: 'Checked in the field.',
      treatment: 'Uproot infected plants.',
    })

    expect(post).toHaveBeenCalledWith('/api/advisories/4/approve', {
      note: 'Checked in the field.',
      treatment: 'Uproot infected plants.',
    })
  })

  it("sends a correction's disease and treatment", async () => {
    await rejectAdvisory(4, { diseaseKey: 'other', treatment: 'Send a sample to the lab.' })

    expect(post).toHaveBeenCalledWith('/api/advisories/4/reject', {
      diseaseKey: 'other',
      treatment: 'Send a sample to the lab.',
    })
  })

  it('still sends an empty body for a bare approve', async () => {
    await approveAdvisory(4)

    expect(post).toHaveBeenCalledWith('/api/advisories/4/approve', {})
  })
})
