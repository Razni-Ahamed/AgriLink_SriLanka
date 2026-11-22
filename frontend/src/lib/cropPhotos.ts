/**
 * One photograph per crop type, so every listing, crop card and crop page has a real picture of
 * what is being grown or sold. Listings don't carry photos of their own (yet), so this is what
 * buyers see.
 *
 * All are free to use under the Unsplash licence, which requires no credit; the photographer and
 * the original are kept here as a record, the way homePhotos.ts does for the landing page.
 *
 * Each photo comes in three widths, all WebP and only downloaded when a page shows them:
 * - 800 × 600 (`crops/*.webp`, about 100 KB): page banners and a listing's big photo.
 * - 480 × 360 (`crops/480/`, about 25 KB): cards, picked by the browser through `srcSet`.
 * - 192 × 144 (`crops/192/`, about 6 KB): the small rounded thumbnails in lists (44–48 px).
 * The smaller two are resized copies of the 800 px file (`scripts/resize-crop-photos.py`); run it
 * again after adding or replacing a photo.
 */
const large = import.meta.glob<string>('@/assets/crops/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})
const medium = import.meta.glob<string>('@/assets/crops/480/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})
const small = import.meta.glob<string>('@/assets/crops/192/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})

/** File name (without .webp) → URL, e.g. `green-gram` → `/assets/green-gram-a1b2.webp`. */
const bySlugOf = (files: Record<string, string>) =>
  new Map(
    Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]),
  )
const bySlug = bySlugOf(large)
const mediumBySlug = bySlugOf(medium)
const smallBySlug = bySlugOf(small)

export interface PhotoCredit {
  photographer: string
  /** The original on Unsplash. */
  source: string
}

/** Kept as a record of where each photo came from (no credit is required). */
export const CROP_PHOTO_CREDITS: Record<string, PhotoCredit> = {
  avocado: { photographer: 'engin akyurt', source: 'https://unsplash.com/photos/uDtO1mko__w' },
  banana: { photographer: 'Rodrigo dos Reis', source: 'https://unsplash.com/photos/DkTuGvgPotA' },
  beans: { photographer: 'Matilda Bellman', source: 'https://unsplash.com/photos/bEnSMaiHeX0' },
  beetroot: { photographer: 'Eugene Golovesov', source: 'https://unsplash.com/photos/-eOGjaog7h0' },
  brinjal: { photographer: 'engin akyurt', source: 'https://unsplash.com/photos/d6I1ZNZJcNo' },
  cabbage: { photographer: 'Natasha Skov', source: 'https://unsplash.com/photos/ujh4hU9S-KA' },
  cardamom: { photographer: 'Jaspreet Kalsi', source: 'https://unsplash.com/photos/oRrHRZeqy_Q' },
  carrot: { photographer: 'Nick Fewings', source: 'https://unsplash.com/photos/IZq1FV87qpM' },
  cassava: { photographer: 'Daniel Dan', source: 'https://unsplash.com/photos/sixDoAtyVwo' },
  chilli: { photographer: 'Bruce Barrow', source: 'https://unsplash.com/photos/MLNiVF9kHss' },
  cinnamon: { photographer: 'Marta Matyszczyk', source: 'https://unsplash.com/photos/yGFJqsMKeJ4' },
  coconut: { photographer: 'Peter Fogden', source: 'https://unsplash.com/photos/toB7tKXne7U' },
  cowpea: { photographer: 'Jasmine Waheed', source: 'https://unsplash.com/photos/rZzRWBM7-zw' },
  cucumber: { photographer: 'Harshal S. Hirve', source: 'https://unsplash.com/photos/2GiRcLP_jkI' },
  'green-gram': {
    photographer: 'David Gabrielyan',
    source: 'https://unsplash.com/photos/ecpymDlXwHE',
  },
  groundnut: {
    photographer: 'Vladislav Nikonov',
    source: 'https://unsplash.com/photos/13lLAWadKwU',
  },
  leeks: { photographer: 'Anastasiya Badun', source: 'https://unsplash.com/photos/uj3uG7tIg8s' },
  maize: { photographer: 'Marek Studzinski', source: 'https://unsplash.com/photos/gLDElXUHwNg' },
  mango: {
    photographer: 'Jacqueline Brandwayn',
    source: 'https://unsplash.com/photos/McxsrN3WW48',
  },
  okra: { photographer: 'Elianna Friedman', source: 'https://unsplash.com/photos/lo-uDeMugA9ojU' },
  onion: { photographer: 'Paul Magdas', source: 'https://unsplash.com/photos/SSIwIRCu7bM' },
  other: { photographer: 'Alex Hudson', source: 'https://unsplash.com/photos/m3I92SgM3Mk' },
  paddy: { photographer: 'Declan Sun', source: 'https://unsplash.com/photos/wnIeCBJfUYM' },
  papaya: { photographer: 'Bon Vivant', source: 'https://unsplash.com/photos/Ooj1c6fhdFM' },
  'passion-fruit': {
    photographer: 'Michael Kucharski',
    source: 'https://unsplash.com/photos/dVBxFStU7kQ',
  },
  pepper: { photographer: 'Anas Alhajj', source: 'https://unsplash.com/photos/jtKNexfk33c' },
  pineapple: {
    photographer: 'Stephany Williams',
    source: 'https://unsplash.com/photos/yx3-a7ualMM',
  },
  potato: { photographer: 'engin akyurt', source: 'https://unsplash.com/photos/O9p8KIv39gA' },
  pumpkin: { photographer: 'Kerstin Wrba', source: 'https://unsplash.com/photos/zeInZepl_Hw' },
  rubber: { photographer: 'Isuru Ranasinha', source: 'https://unsplash.com/photos/3JdlP4prtjg' },
  soybean: { photographer: '360floralflaves', source: 'https://unsplash.com/photos/stugdp8qxIU' },
  sugarcane: {
    photographer: 'J A N U P R A S A D',
    source: 'https://unsplash.com/photos/1y1i3SffSXs',
  },
  'sweet-potato': {
    photographer: 'Glen Hayoge',
    source: 'https://unsplash.com/photos/k0MigzUz-vI',
  },
  tea: { photographer: 'feifei liang', source: 'https://unsplash.com/photos/K7DllgDsGNo' },
  tomato: { photographer: 'engin akyurt', source: 'https://unsplash.com/photos/eb26eV-ys_k' },
}

/** `Green Gram` → `green-gram`, the photo's file name. */
export function cropPhotoSlug(cropType: string): string {
  return cropType.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * The photo for a crop name, or the general market photo for a crop with none of its own (a crop
 * the server added ahead of the UI, or "Other").
 */
export function cropPhoto(cropType: string): string {
  return pick(bySlug, cropType)
}

/** The small (192 px wide) photo, for thumbnails shown at about 48 px. */
export function cropThumb(cropType: string): string {
  return pick(smallBySlug, cropType) || cropPhoto(cropType)
}

/**
 * `srcSet` for a card-sized photo: the browser takes the 480 px copy where it's enough and the
 * 800 px one on wide or high-density screens. Pair with `cropPhoto` as `src` and a `sizes`.
 */
export function cropPhotoSrcSet(cropType: string): string {
  const medium = pick(mediumBySlug, cropType)
  const full = cropPhoto(cropType)
  return medium ? `${medium} 480w, ${full} 800w` : ''
}

function pick(files: Map<string, string>, cropType: string): string {
  return files.get(cropPhotoSlug(cropType)) ?? files.get('other') ?? ''
}
