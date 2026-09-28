import examiningLeaves640 from '@/assets/home/examining-leaves-640.webp'
import examiningLeaves1280 from '@/assets/home/examining-leaves-1280.webp'
import farmerGarden640 from '@/assets/home/farmer-garden-640.webp'
import farmerGarden1280 from '@/assets/home/farmer-garden-1280.webp'
import fruitStall640 from '@/assets/home/fruit-stall-640.webp'
import fruitStall1280 from '@/assets/home/fruit-stall-1280.webp'
import marketHandover640 from '@/assets/home/market-handover-640.webp'
import marketHandover1280 from '@/assets/home/market-handover-1280.webp'
import paddyAerial640 from '@/assets/home/paddy-aerial-640.webp'
import paddyAerial1280 from '@/assets/home/paddy-aerial-1280.webp'
import paddyFarmer640 from '@/assets/home/paddy-farmer-640.webp'
import paddyFarmer1280 from '@/assets/home/paddy-farmer-1280.webp'
import riceWinnowing640 from '@/assets/home/rice-winnowing-640.webp'
import riceWinnowing1280 from '@/assets/home/rice-winnowing-1280.webp'
import teaHaputale640 from '@/assets/home/tea-haputale-640.webp'
import teaHaputale1280 from '@/assets/home/tea-haputale-1280.webp'
import tendingCrop640 from '@/assets/home/tending-crop-640.webp'
import tendingCrop1280 from '@/assets/home/tending-crop-1280.webp'
import vegetableStall640 from '@/assets/home/vegetable-stall-640.webp'
import vegetableStall1280 from '@/assets/home/vegetable-stall-1280.webp'
import walkingFields640 from '@/assets/home/walking-fields-640.webp'
import walkingFields1280 from '@/assets/home/walking-fields-1280.webp'

/**
 * The home page's photographs: all taken in Sri Lanka, all free to use under the Unsplash or
 * Pexels licence (no credit required, though the footer gives one). Each is WebP at 640 and 1280px
 * wide, so the browser downloads the smaller one wherever it's enough. The captions only describe
 * the scene: these are stock photos, not AgriLink's own farmers, officers or buyers.
 */
export interface HomePhoto {
  /** Key under `home:photos`, used as both the alt text and the caption. */
  key: PhotoKey
  src: string
  srcSet: string
  photographer: string
  /** The original, on Unsplash or Pexels. */
  source: string
  /** Which part stays in frame when the photo is cropped (CSS object-position). */
  focus?: string
}

const photo = (
  key: PhotoKey,
  small: string,
  large: string,
  photographer: string,
  source: string,
): HomePhoto => ({ key, src: small, srcSet: `${small} 640w, ${large} 1280w`, photographer, source })

export type PhotoKey =
  | 'paddyFarmer'
  | 'teaHaputale'
  | 'paddyAerial'
  | 'fruitStall'
  | 'riceWinnowing'
  | 'tendingCrop'
  | 'examiningLeaves'
  | 'marketHandover'
  | 'farmerGarden'
  | 'walkingFields'
  | 'vegetableStall'

export const PHOTOS = {
  paddyFarmer: photo(
    'paddyFarmer',
    paddyFarmer640,
    paddyFarmer1280,
    'Indika Sriyan',
    'https://unsplash.com/photos/01vS-aVPaVA',
  ),
  teaHaputale: photo(
    'teaHaputale',
    teaHaputale640,
    teaHaputale1280,
    'Nawartha Nirmal',
    'https://unsplash.com/photos/7Pvfj-7n0kc',
  ),
  paddyAerial: photo(
    'paddyAerial',
    paddyAerial640,
    paddyAerial1280,
    'Ravin Nalin',
    'https://www.pexels.com/photo/35970549/',
  ),
  fruitStall: photo(
    'fruitStall',
    fruitStall640,
    fruitStall1280,
    'Ashen Bandaranayake',
    'https://unsplash.com/photos/xLMUVG1hP_Q',
  ),
  riceWinnowing: photo(
    'riceWinnowing',
    riceWinnowing640,
    riceWinnowing1280,
    'Dinuka Gunawardana',
    'https://www.pexels.com/photo/30808038/',
  ),
  tendingCrop: photo(
    'tendingCrop',
    tendingCrop640,
    tendingCrop1280,
    'Dinuka Gunawardana',
    'https://www.pexels.com/photo/17903068/',
  ),
  examiningLeaves: photo(
    'examiningLeaves',
    examiningLeaves640,
    examiningLeaves1280,
    'Gihan Bandara',
    'https://www.pexels.com/photo/10365845/',
  ),
  // Framed low: the sale itself, rather than the police-station sign above the stall.
  marketHandover: {
    ...photo(
      'marketHandover',
      marketHandover640,
      marketHandover1280,
      'Gihan Bandara',
      'https://www.pexels.com/photo/10784645/',
    ),
    focus: 'center 80%',
  },

  farmerGarden: photo(
    'farmerGarden',
    farmerGarden640,
    farmerGarden1280,
    'Dinuka Gunawardana',
    'https://www.pexels.com/photo/17903071/',
  ),
  walkingFields: photo(
    'walkingFields',
    walkingFields640,
    walkingFields1280,
    'Ramesh Nimsara Kariyawasam',
    'https://www.pexels.com/photo/17396316/',
  ),
  vegetableStall: photo(
    'vegetableStall',
    vegetableStall640,
    vegetableStall1280,
    'Thilina Alagiyawanna',
    'https://www.pexels.com/photo/37052004/',
  ),
} as const satisfies Record<PhotoKey, HomePhoto>

/** Everyone whose work appears on the page, once each, for the footer's credit line. */
export const PHOTOGRAPHERS = [...new Set(Object.values(PHOTOS).map((p) => p.photographer))]
