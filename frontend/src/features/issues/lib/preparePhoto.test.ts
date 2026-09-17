import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_PHOTO_BYTES, MAX_PHOTO_LONG_SIDE, preparePhotoForUpload } from './preparePhoto'

function fileOf(size: number, type: string, name = 'leaf.jpg') {
  return new File([new Uint8Array(size)], name, { type })
}

describe('preparePhotoForUpload', () => {
  let drawn: { width: number; height: number } | null
  let encodedSize: number | null

  beforeEach(() => {
    drawn = null
    encodedSize = 300_000
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      return {
        fillRect: vi.fn(),
        drawImage: (_image: unknown, _x: number, _y: number, width: number, height: number) => {
          drawn = { width, height }
        },
        fillStyle: '',
      } as unknown as CanvasRenderingContext2D
    } as unknown as typeof HTMLCanvasElement.prototype.getContext)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      callback: BlobCallback,
      type?: string,
    ) {
      callback(encodedSize === null ? null : new Blob([new Uint8Array(encodedSize)], { type }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shrinks a large phone photo to the maximum long side and re-encodes it as JPEG', async () => {
    const result = await preparePhotoForUpload(fileOf(4_000_000, 'image/png', 'IMG_2041.png'))

    expect(drawn).toEqual({ width: MAX_PHOTO_LONG_SIDE, height: 1200 })
    expect(result).toMatchObject({ ok: true })
    if (!result.ok) return
    expect(result.file.type).toBe('image/jpeg')
    expect(result.file.name).toBe('IMG_2041.jpg')
    expect(result.file.size).toBe(300_000)
  })

  it('keeps the original when re-encoding would make it bigger', async () => {
    encodedSize = 900_000
    const original = fileOf(200_000, 'image/jpeg')

    const result = await preparePhotoForUpload(original)

    expect(result).toEqual({ ok: true, file: original })
  })

  it('rejects a file that is not an image', async () => {
    const result = await preparePhotoForUpload(fileOf(1000, 'application/pdf', 'report.pdf'))

    expect(result).toEqual({ ok: false, problem: 'notAnImage' })
  })

  it('reports an undecodable format the backend would not accept either', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => Promise.reject(new Error('cannot decode'))),
    )

    const result = await preparePhotoForUpload(fileOf(2_000_000, 'image/heic', 'IMG_1.heic'))

    expect(result).toEqual({ ok: false, problem: 'unsupported' })
  })

  it('falls back to an accepted original when the browser cannot decode it', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => Promise.reject(new Error('cannot decode'))),
    )
    const original = fileOf(1_000_000, 'image/webp', 'leaf.webp')

    const result = await preparePhotoForUpload(original)

    expect(result).toEqual({ ok: true, file: original })
  })

  it('reports a photo still over the upload limit', async () => {
    encodedSize = MAX_PHOTO_BYTES + 1

    const result = await preparePhotoForUpload(fileOf(MAX_PHOTO_BYTES + 10, 'image/jpeg'))

    expect(result).toEqual({ ok: false, problem: 'tooLarge' })
  })
})
