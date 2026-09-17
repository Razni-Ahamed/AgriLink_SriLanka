import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { createIssue } from './issuesApi'

vi.mock('@/lib/apiClient', () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }))

const post = vi.mocked(apiClient.post)
const fields = {
  cropId: 3,
  title: 'Yellow leaves',
  description: 'Mottled yellow patches',
  severity: 'Medium' as const,
}

describe('createIssue', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue({ data: { issueId: 1 } })
  })

  it('sends a report without a photo as JSON to the original endpoint', async () => {
    await createIssue(fields)

    expect(post).toHaveBeenCalledWith('/api/issues', fields)
  })

  it('sends a report with a photo as multipart form data to the photo endpoint', async () => {
    const photo = new File([new Uint8Array(10)], 'leaf.jpg', { type: 'image/jpeg' })

    await createIssue({ ...fields, photo })

    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/api/issues/with-photo')
    const form = body as FormData
    expect(form.get('cropId')).toBe('3')
    expect(form.get('title')).toBe('Yellow leaves')
    expect(form.get('description')).toBe('Mottled yellow patches')
    expect(form.get('severity')).toBe('Medium')
    expect((form.get('photo') as File).name).toBe('leaf.jpg')
  })
})
