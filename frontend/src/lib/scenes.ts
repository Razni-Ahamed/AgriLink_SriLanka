import examiningLeaves from '@/assets/home/examining-leaves-1280.webp'
import farmerGarden from '@/assets/home/farmer-garden-1280.webp'
import fruitStall from '@/assets/home/fruit-stall-1280.webp'
import marketHandover from '@/assets/home/market-handover-1280.webp'
import paddyAerial from '@/assets/home/paddy-aerial-1280.webp'
import paddyFarmer from '@/assets/home/paddy-farmer-1280.webp'
import riceWinnowing from '@/assets/home/rice-winnowing-1280.webp'
import teaHaputale from '@/assets/home/tea-haputale-1280.webp'
import tendingCrop from '@/assets/home/tending-crop-1280.webp'
import vegetableStall from '@/assets/home/vegetable-stall-1280.webp'
import walkingFields from '@/assets/home/walking-fields-1280.webp'

/**
 * The Sri Lankan field and market photos (see features/home/homePhotos.ts for their sources),
 * named by what each page is about, for the photo banners at the top of pages. Canopy's idea is
 * that real photography sits under the glass; these are that photography.
 */
export const scenes = {
  /** Terraced paddy from above: the landing page and anything about the whole country. */
  fields: paddyAerial,
  /** A farmer's own plot: farms, fields, a farmer's home. */
  farm: farmerGarden,
  /** A tea estate in Haputale: morning, "today". */
  morning: teaHaputale,
  /** A vegetable stall: the marketplace. */
  market: vegetableStall,
  /** A fruit stall: listings and requests. */
  produce: fruitStall,
  /** A hand-over at a market: orders. */
  handover: marketHandover,
  /** Someone checking leaves closely: crop problems and advice. */
  inspection: examiningLeaves,
  /** Spraying a crop: officers' work. */
  care: tendingCrop,
  /** A paddy farmer: people, accounts, registrations. */
  people: paddyFarmer,
  /** Winnowing rice: records and history (the audit log, notifications). */
  harvestWork: riceWinnowing,
  /** Walking between fields: messages. */
  path: walkingFields,
} as const

export type Scene = keyof typeof scenes

// Farms have no photos of their own, so each gets one of the field photos, picked by its id so a
// farm always shows the same one (on its card and on its page).
const FARM_PHOTOS = [scenes.farm, scenes.fields, scenes.morning, scenes.care]

export function farmPhoto(farmId: number): string {
  return FARM_PHOTOS[Math.abs(farmId) % FARM_PHOTOS.length]
}
