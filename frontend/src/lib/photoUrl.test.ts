import { describe, expect, it } from 'vitest'
import { safePhotoUrl } from './photoUrl'

describe('safePhotoUrl', () => {
  it('accepts an https URL', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/agrilink/avatars/abc.jpg'
    expect(safePhotoUrl(url)).toBe(url)
  })

  it('accepts plain http only on localhost, where the dev API serves avatars itself', () => {
    expect(safePhotoUrl('http://localhost:5266/api/profile-photos/abc.jpg')).toBe(
      'http://localhost:5266/api/profile-photos/abc.jpg',
    )
    expect(safePhotoUrl('http://127.0.0.1:5266/api/profile-photos/abc.jpg')).toBe(
      'http://127.0.0.1:5266/api/profile-photos/abc.jpg',
    )
  })

  it('rejects plain http anywhere else', () => {
    expect(safePhotoUrl('http://example.com/a.jpg')).toBeNull()
    // Hostnames that merely start with the allowed ones must not pass.
    expect(safePhotoUrl('http://localhost.evil.com/a.jpg')).toBeNull()
  })

  it('rejects anything that is not an absolute http(s) URL', () => {
    expect(safePhotoUrl('data:image/png;base64,AAAA')).toBeNull()
    expect(safePhotoUrl('javascript:alert(1)')).toBeNull()
    expect(safePhotoUrl('/api/profile-photos/abc.jpg')).toBeNull()
    expect(safePhotoUrl('not a url')).toBeNull()
    expect(safePhotoUrl(null)).toBeNull()
    expect(safePhotoUrl(undefined)).toBeNull()
    expect(safePhotoUrl('')).toBeNull()
  })
})
