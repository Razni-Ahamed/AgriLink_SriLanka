/** Matches the backend's IssuePhotoProcessor: larger uploads are rejected. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
/** The backend shrinks photos to this anyway, so sending more only costs the farmer mobile data. */
export const MAX_PHOTO_LONG_SIDE = 1600
const JPEG_QUALITY = 0.85
const UPLOADABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type PhotoProblem = 'notAnImage' | 'unsupported' | 'tooLarge'

export type PreparedPhoto = { ok: true; file: File } | { ok: false; problem: PhotoProblem }

/**
 * Readies a farmer's photo for upload: upright (camera orientation applied), at most
 * MAX_PHOTO_LONG_SIDE pixels on its long side, re-encoded as JPEG. Phone photos are often
 * 4–12 MB, which is slow and costly on rural mobile data; this usually brings them under 500 KB.
 *
 * If the browser cannot decode the photo (for example HEIC on some browsers), the original is
 * used when the backend accepts its type and size, and a problem is reported otherwise.
 */
export async function preparePhotoForUpload(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, problem: 'notAnImage' }
  }

  const resized = await resizeToJpeg(file).catch(() => null)
  const candidates = [resized, UPLOADABLE_TYPES.includes(file.type) ? file : null].filter(
    (candidate): candidate is File => candidate !== null,
  )

  if (candidates.length === 0) {
    return { ok: false, problem: 'unsupported' }
  }

  const smallest = candidates.reduce((best, candidate) =>
    candidate.size < best.size ? candidate : best,
  )
  return smallest.size <= MAX_PHOTO_BYTES
    ? { ok: true, file: smallest }
    : { ok: false, problem: 'tooLarge' }
}

async function resizeToJpeg(file: File): Promise<File | null> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_PHOTO_LONG_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    // JPEG has no transparency: fill white first, as the backend does, instead of black.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) {
      return null
    }

    const name = file.name.replace(/\.[^.]*$/, '') || 'photo'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
