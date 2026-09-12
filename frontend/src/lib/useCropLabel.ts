import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { CropGroup } from './cropCatalog'

/**
 * Crop names arrive from the API as plain strings, so they are mapped to translation keys
 * explicitly — the same approach useStatusLabel takes, and for the same reason: `t()` is typed
 * against the English resources, so a key assembled by interpolation cannot be checked. A crop
 * the map doesn't know (one recorded before the catalogue existed) falls back to its raw name
 * rather than rendering a missing-key placeholder.
 */
const CROP_LABEL_KEYS = {
  Tea: 'cropTypes.Tea',
  Rubber: 'cropTypes.Rubber',
  Coconut: 'cropTypes.Coconut',
  Cinnamon: 'cropTypes.Cinnamon',
  Pepper: 'cropTypes.Pepper',
  Cardamom: 'cropTypes.Cardamom',
  Sugarcane: 'cropTypes.Sugarcane',
  Paddy: 'cropTypes.Paddy',
  Maize: 'cropTypes.Maize',
  'Green Gram': 'cropTypes.Green Gram',
  Cowpea: 'cropTypes.Cowpea',
  Groundnut: 'cropTypes.Groundnut',
  Soybean: 'cropTypes.Soybean',
  Potato: 'cropTypes.Potato',
  'Sweet Potato': 'cropTypes.Sweet Potato',
  Cassava: 'cropTypes.Cassava',
  Onion: 'cropTypes.Onion',
  Tomato: 'cropTypes.Tomato',
  Chilli: 'cropTypes.Chilli',
  Brinjal: 'cropTypes.Brinjal',
  Okra: 'cropTypes.Okra',
  Cabbage: 'cropTypes.Cabbage',
  Carrot: 'cropTypes.Carrot',
  Beans: 'cropTypes.Beans',
  Pumpkin: 'cropTypes.Pumpkin',
  Cucumber: 'cropTypes.Cucumber',
  Leeks: 'cropTypes.Leeks',
  Beetroot: 'cropTypes.Beetroot',
  Banana: 'cropTypes.Banana',
  Mango: 'cropTypes.Mango',
  Pineapple: 'cropTypes.Pineapple',
  Papaya: 'cropTypes.Papaya',
  Avocado: 'cropTypes.Avocado',
  'Passion Fruit': 'cropTypes.Passion Fruit',
  Other: 'cropTypes.Other',
} as const

const CROP_GROUP_KEYS = {
  plantation: 'cropGroups.plantation',
  cereals: 'cropGroups.cereals',
  roots: 'cropGroups.roots',
  vegetables: 'cropGroups.vegetables',
  fruit: 'cropGroups.fruit',
  other: 'cropGroups.other',
} as const

type CropLabelKey = (typeof CROP_LABEL_KEYS)[keyof typeof CROP_LABEL_KEYS]

export function useCropLabel() {
  const { t } = useTranslation('common')

  return useCallback(
    (cropType: string): string => {
      const keys: Record<string, CropLabelKey | undefined> = CROP_LABEL_KEYS
      const key = keys[cropType]
      return key ? t(key) : cropType
    },
    [t],
  )
}

export function useCropGroupLabel() {
  const { t } = useTranslation('common')
  return useCallback((group: CropGroup): string => t(CROP_GROUP_KEYS[group]), [t])
}
