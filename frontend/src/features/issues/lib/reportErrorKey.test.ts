import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { reportErrorKey } from './reportErrorKey'

function httpError(status: number) {
  return new AxiosError('failed', undefined, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  })
}

describe('reportErrorKey', () => {
  it.each([
    [400, 'issues:new.photoRejected'],
    [503, 'issues:new.photoUploadUnavailable'],
    [500, 'issues:new.reportError'],
  ])('with a photo, HTTP %i shows %s', (status, key) => {
    expect(reportErrorKey(httpError(status), true)).toBe(key)
  })

  it('never blames the photo when there was none', () => {
    expect(reportErrorKey(httpError(400), false)).toBe('issues:new.reportError')
    expect(reportErrorKey(httpError(503), false)).toBe('issues:new.reportError')
  })

  it('falls back to the general message for a network failure', () => {
    expect(reportErrorKey(new Error('offline'), true)).toBe('issues:new.reportError')
  })
})
