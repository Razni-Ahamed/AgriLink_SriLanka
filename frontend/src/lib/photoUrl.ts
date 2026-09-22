/**
 * Returns the URL when it is an absolute https:// URL, otherwise null. Photo URLs come from the API
 * (Cloudinary's secure URL), but they are stored data rendered into <img src>, so anything else —
 * http:, data:, javascript:, a relative path — is ignored rather than trusted.
 */
export function safePhotoUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
