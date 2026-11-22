import 'fake-indexeddb/auto'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/auth/authStore'
import type { CreateCropIssueRequest } from '@/types/dto/issues'
import {
  getQueuedIssueReports,
  isConnectionFailure,
  queueIssueReport,
  sendQueuedIssueReports,
  subscribeToOutbox,
} from './issueOutbox'

const report = (title: string): CreateCropIssueRequest => ({
  cropId: 3,
  title,
  description: 'Mottled yellow patches',
  severity: 'Medium',
})

function httpError(status: number) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  })
}
const connectionError = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK)

/** Signs `owner` in: the outbox only sends a report with its own author's session. */
function signInAs(owner: string | null) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const token = owner
    ? `${encode({ alg: 'none' })}.${encode({ sub: owner, exp: 4102444800 })}.sig`
    : null
  useAuthStore.setState({ token })
}

beforeEach(() => signInAs('farmer-1'))

afterEach(async () => {
  // Empty both farmers' queues between tests.
  for (const owner of ['farmer-1', 'farmer-2']) {
    signInAs(owner)
    await sendQueuedIssueReports(owner, async () => undefined)
  }
})

describe('issue report outbox', () => {
  it('keeps reports, with their photo, for the farmer who made them only', async () => {
    const photo = new File([new Uint8Array([1, 2, 3])], 'leaf.jpg', { type: 'image/jpeg' })
    await queueIssueReport('farmer-1', { ...report('Yellow leaves'), photo })
    await queueIssueReport('farmer-2', report('Wilting'))

    const mine = await getQueuedIssueReports('farmer-1')
    expect(mine.map((queued) => queued.fields.title)).toEqual(['Yellow leaves'])
    expect(mine[0].photo?.name).toBe('leaf.jpg')
    expect((await getQueuedIssueReports('farmer-2')).map((queued) => queued.fields.title)).toEqual([
      'Wilting',
    ])
  })

  it('sends oldest first, as createIssue expects them, and empties the queue', async () => {
    const photo = new File([new Uint8Array([1, 2, 3])], 'leaf.jpg', { type: 'image/jpeg' })
    await queueIssueReport('farmer-1', { ...report('First'), photo })
    await queueIssueReport('farmer-1', report('Second'))
    const send = vi.fn().mockResolvedValue({})

    const result = await sendQueuedIssueReports('farmer-1', send)

    expect(result).toEqual({ sent: 2, rejected: 0, remaining: 0 })
    expect(send.mock.calls.map(([request]) => request.title)).toEqual(['First', 'Second'])
    const sentPhoto = send.mock.calls[0][0].photo as File
    expect(sentPhoto).toBeInstanceOf(File)
    expect(sentPhoto.name).toBe('leaf.jpg')
    expect(sentPhoto.type).toBe('image/jpeg')
    expect(await getQueuedIssueReports('farmer-1')).toEqual([])
  })

  it('stops and keeps everything when the signal fails again', async () => {
    await queueIssueReport('farmer-1', report('First'))
    await queueIssueReport('farmer-1', report('Second'))
    const send = vi.fn().mockRejectedValue(connectionError())

    const result = await sendQueuedIssueReports('farmer-1', send)

    expect(result).toEqual({ sent: 0, rejected: 0, remaining: 2 })
    expect(send).toHaveBeenCalledTimes(1)
    expect(await getQueuedIssueReports('farmer-1')).toHaveLength(2)
  })

  it.each([401, 403, 429, 500, 503])(
    'keeps the report after a %i, to try again later',
    async (status) => {
      await queueIssueReport('farmer-1', report('First'))

      const result = await sendQueuedIssueReports('farmer-1', () =>
        Promise.reject(httpError(status)),
      )

      expect(result.remaining).toBe(1)
      expect(await getQueuedIssueReports('farmer-1')).toHaveLength(1)
    },
  )

  it('drops a report the server refuses for good and carries on with the rest', async () => {
    await queueIssueReport('farmer-1', report('Deleted crop'))
    await queueIssueReport('farmer-1', report('Fine'))
    const send = vi.fn().mockRejectedValueOnce(httpError(404)).mockResolvedValueOnce({})

    const result = await sendQueuedIssueReports('farmer-1', send)

    expect(result).toEqual({ sent: 1, rejected: 1, remaining: 0 })
    expect(await getQueuedIssueReports('farmer-1')).toEqual([])
  })

  it('never sends a report twice when two sends start together', async () => {
    await queueIssueReport('farmer-1', report('Only once'))
    const send = vi.fn().mockResolvedValue({})

    await Promise.all([
      sendQueuedIssueReports('farmer-1', send),
      sendQueuedIssueReports('farmer-1', send),
    ])

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('tells listeners when the queue changes', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToOutbox(listener)
    await queueIssueReport('farmer-1', report('First'))
    unsubscribe()

    expect(listener).toHaveBeenCalled()
  })
})

describe('isConnectionFailure', () => {
  it('is true only when no answer came back', () => {
    expect(isConnectionFailure(connectionError())).toBe(true)
    expect(isConnectionFailure(httpError(500))).toBe(false)
    expect(isConnectionFailure(new AxiosError('canceled', AxiosError.ERR_CANCELED))).toBe(false)
    expect(isConnectionFailure(new Error('other'))).toBe(false)
  })

  it('stops when someone else signs in, and keeps the rest for their author', async () => {
    await queueIssueReport('farmer-1', report('First'))
    await queueIssueReport('farmer-1', report('Second'))
    await queueIssueReport('farmer-1', report('Third'))
    const send = vi.fn().mockImplementation(async () => {
      // Farmer 2 signs in on the same phone while the first report is going out.
      signInAs('farmer-2')
    })

    const result = await sendQueuedIssueReports('farmer-1', send)

    expect(send).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ sent: 1, rejected: 0, remaining: 2 })
    expect((await getQueuedIssueReports('farmer-1')).map((queued) => queued.fields.title)).toEqual([
      'Second',
      'Third',
    ])
  })

  it('sends nothing while nobody, or someone else, is signed in', async () => {
    await queueIssueReport('farmer-1', report('Waiting'))
    const send = vi.fn().mockResolvedValue({})

    signInAs(null)
    await sendQueuedIssueReports('farmer-1', send)
    signInAs('farmer-2')
    await sendQueuedIssueReports('farmer-1', send)

    expect(send).not.toHaveBeenCalled()
    expect(await getQueuedIssueReports('farmer-1')).toHaveLength(1)
  })

  it('keeps the report id, so a retry is recognised by the server', async () => {
    await queueIssueReport('farmer-1', { ...report('With id'), clientReportId: 'abc-123' })
    const send = vi.fn().mockResolvedValue({})

    await sendQueuedIssueReports('farmer-1', send)

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ clientReportId: 'abc-123' }))
  })
})
