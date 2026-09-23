/**
 * Returns the URL when it is safe to render into <img src>, otherwise null. Photo URLs come from
 * the API (Cloudinary's secure URL in production), but they are stored data, so anything other than
 * https — data:, javascript:, a relative path — is ignored rather than trusted.
 *
 * Plain http is allowed for localhost alone: with Cloudinary unconfigured the API serves avatars
 * itself over http on a dev machine, and without this every local photo silently fell back to the
 * role's default picture. No deployed URL is ever a localhost one, so this cannot loosen production.
 */
export function safePhotoUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') {
      return url
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    return parsed.protocol === 'http:' && isLocalhost ? url : null
  } catch {
    return null
  }
}
