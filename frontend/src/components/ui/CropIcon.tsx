import { createElement } from 'react'
import { cropCatalogEntry } from '@/lib/cropCatalog'

interface CropIconProps {
  cropType: string
  size?: number
  className?: string
}

/**
 * Draws the catalogue icon for a crop name.
 *
 * Consumers render `<CropIcon cropType={...} />` rather than pulling the component out of the
 * catalogue and rendering it from a local (`const Icon = cropIcon(x); <Icon />`). React
 * Compiler rejects that shape — it cannot tell the looked-up component is stable across
 * renders, so it reads as a component being created during render.
 */
export function CropIcon({ cropType, size = 20, className }: CropIconProps) {
  return createElement(cropCatalogEntry(cropType).Icon, { size, className })
}
