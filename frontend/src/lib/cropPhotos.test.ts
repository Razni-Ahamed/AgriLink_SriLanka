import { describe, expect, it } from 'vitest'
import { cropPhoto, cropPhotoPhoneSrcSet, cropPhotoSrcSet, cropThumb } from './cropPhotos'

describe('crop photos', () => {
  it('gives each crop a small thumbnail separate from its full photo', () => {
    const thumb = cropThumb('Green Gram')
    expect(thumb).toContain('green-gram')
    expect(thumb).not.toBe(cropPhoto('Green Gram'))
  })

  it('offers a 480, a 640 and an 800 px copy for cards', () => {
    const srcSet = cropPhotoSrcSet('Banana')
    expect(srcSet).toMatch(/banana.*480w, .*banana.*640w, .*banana.*800w$/)
    expect(srcSet).toContain(`${cropPhoto('Banana')} 800w`)
  })

  it('leaves the 800 px copy out for phones', () => {
    const srcSet = cropPhotoPhoneSrcSet('Banana')
    expect(srcSet).toMatch(/banana.*480w, .*banana.*640w$/)
    expect(srcSet).not.toContain(cropPhoto('Banana'))
  })

  it('falls back to the general market photo for an unknown crop', () => {
    expect(cropThumb('Dragon Fruit')).toBe(cropThumb('Other'))
    expect(cropPhotoSrcSet('Dragon Fruit')).toBe(cropPhotoSrcSet('Other'))
    expect(cropPhotoPhoneSrcSet('Dragon Fruit')).toBe(cropPhotoPhoneSrcSet('Other'))
  })
})
