import { cropThumb } from '@/lib/cropPhotos'
import { cn } from '@/lib/utils'

/** A small rounded photo of a crop, where lists used to show the crop's icon in a badge. */
export function CropThumb({ cropType, className }: { cropType: string; className?: string }) {
  return (
    <img
      src={cropThumb(cropType)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={cn('size-12 shrink-0 rounded-2xl object-cover shadow-sm', className)}
    />
  )
}
