import { cropPhoto, cropPhotoPhoneSrcSet, cropPhotoSrcSet } from '@/lib/cropPhotos'

/** Below Tailwind's `sm` breakpoint, where card grids are one column wide. */
const PHONE = '(max-width: 639px)'

interface CropCardPhotoProps {
  cropType: string
  /** The card photo's width on a phone, as a `sizes` length, e.g. `calc(100vw - 46px)`. */
  phoneSize: string
  /** `sizes` from the `sm` breakpoint up, matching the grid's real column width. */
  sizes: string
  className?: string
}

/**
 * A crop's photo filling a card. Phones choose between the 480 and 640 px copies only (see
 * `cropPhotoPhoneSrcSet`); wider screens can also take the 800 px one. The `sizes` should follow
 * the grid the card sits in: a too-large one makes the browser download a bigger copy than it shows.
 */
export function CropCardPhoto({ cropType, phoneSize, sizes, className }: CropCardPhotoProps) {
  return (
    <picture>
      <source media={PHONE} srcSet={cropPhotoPhoneSrcSet(cropType)} sizes={phoneSize} />
      <img
        src={cropPhoto(cropType)}
        srcSet={cropPhotoSrcSet(cropType)}
        sizes={sizes}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={className}
      />
    </picture>
  )
}
