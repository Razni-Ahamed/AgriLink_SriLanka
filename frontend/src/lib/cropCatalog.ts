import type { ComponentType } from 'react'
import { TeaLeafIcon, RiceGrainIcon, CropGenericIcon } from '@/components/ui/icons/custom'
import type { IconProps } from '@/components/ui/icons/custom'
import {
  AvocadoIcon,
  BananaIcon,
  BeansIcon,
  BeetrootIcon,
  BrinjalIcon,
  CabbageIcon,
  CardamomIcon,
  CarrotIcon,
  CassavaIcon,
  ChilliIcon,
  CinnamonIcon,
  CoconutIcon,
  CowpeaIcon,
  CucumberIcon,
  GreenGramIcon,
  GroundnutIcon,
  LeeksIcon,
  MaizeIcon,
  MangoIcon,
  OkraIcon,
  OnionIcon,
  PapayaIcon,
  PassionFruitIcon,
  PepperIcon,
  PineappleIcon,
  PotatoIcon,
  PumpkinIcon,
  RubberTreeIcon,
  SoybeanIcon,
  SugarcaneIcon,
  SweetPotatoIcon,
  TomatoIcon,
} from '@/components/ui/icons/crops'

export type CropGroup = 'plantation' | 'cereals' | 'roots' | 'vegetables' | 'fruit' | 'other'

export interface CropCatalogEntry {
  /** Canonical crop name — must match Data/CropTypes.All on the backend exactly. */
  value: string
  group: CropGroup
  Icon: ComponentType<IconProps>
}

/**
 * The display side of the crop catalogue: icon and grouping for each crop type.
 *
 * The backend's `Data/CropTypes.All` stays the source of truth for which crop types are
 * *valid* — `GET /api/crop-types` serves it and the API rejects anything else. This list only
 * says how to draw them, and the order here is the order pickers show. A crop the server knows
 * about but this list doesn't still renders (with the generic icon, in the "other" group), so
 * adding a crop server-side never breaks the UI — see `cropCatalogEntry`.
 */
export const CROP_CATALOG: CropCatalogEntry[] = [
  // Plantation / export
  { value: 'Tea', group: 'plantation', Icon: TeaLeafIcon },
  { value: 'Rubber', group: 'plantation', Icon: RubberTreeIcon },
  { value: 'Coconut', group: 'plantation', Icon: CoconutIcon },
  { value: 'Cinnamon', group: 'plantation', Icon: CinnamonIcon },
  { value: 'Pepper', group: 'plantation', Icon: PepperIcon },
  { value: 'Cardamom', group: 'plantation', Icon: CardamomIcon },
  { value: 'Sugarcane', group: 'plantation', Icon: SugarcaneIcon },
  // Cereals and pulses
  { value: 'Paddy', group: 'cereals', Icon: RiceGrainIcon },
  { value: 'Maize', group: 'cereals', Icon: MaizeIcon },
  { value: 'Green Gram', group: 'cereals', Icon: GreenGramIcon },
  { value: 'Cowpea', group: 'cereals', Icon: CowpeaIcon },
  { value: 'Groundnut', group: 'cereals', Icon: GroundnutIcon },
  { value: 'Soybean', group: 'cereals', Icon: SoybeanIcon },
  // Roots and tubers
  { value: 'Potato', group: 'roots', Icon: PotatoIcon },
  { value: 'Sweet Potato', group: 'roots', Icon: SweetPotatoIcon },
  { value: 'Cassava', group: 'roots', Icon: CassavaIcon },
  { value: 'Onion', group: 'roots', Icon: OnionIcon },
  // Vegetables
  { value: 'Tomato', group: 'vegetables', Icon: TomatoIcon },
  { value: 'Chilli', group: 'vegetables', Icon: ChilliIcon },
  { value: 'Brinjal', group: 'vegetables', Icon: BrinjalIcon },
  { value: 'Okra', group: 'vegetables', Icon: OkraIcon },
  { value: 'Cabbage', group: 'vegetables', Icon: CabbageIcon },
  { value: 'Carrot', group: 'vegetables', Icon: CarrotIcon },
  { value: 'Beans', group: 'vegetables', Icon: BeansIcon },
  { value: 'Pumpkin', group: 'vegetables', Icon: PumpkinIcon },
  { value: 'Cucumber', group: 'vegetables', Icon: CucumberIcon },
  { value: 'Leeks', group: 'vegetables', Icon: LeeksIcon },
  { value: 'Beetroot', group: 'vegetables', Icon: BeetrootIcon },
  // Fruit
  { value: 'Banana', group: 'fruit', Icon: BananaIcon },
  { value: 'Mango', group: 'fruit', Icon: MangoIcon },
  { value: 'Pineapple', group: 'fruit', Icon: PineappleIcon },
  { value: 'Papaya', group: 'fruit', Icon: PapayaIcon },
  { value: 'Avocado', group: 'fruit', Icon: AvocadoIcon },
  { value: 'Passion Fruit', group: 'fruit', Icon: PassionFruitIcon },
  // Escape hatch
  { value: 'Other', group: 'other', Icon: CropGenericIcon },
]

const byValue = new Map(CROP_CATALOG.map((entry) => [entry.value.toLowerCase(), entry]))

/**
 * The catalogue entry for a crop name, falling back to a generic entry for anything not in the
 * list — crops recorded before the catalogue existed, and any the server adds ahead of the UI.
 */
export function cropCatalogEntry(cropType: string): CropCatalogEntry {
  return (
    byValue.get(cropType.trim().toLowerCase()) ?? {
      value: cropType,
      group: 'other',
      Icon: CropGenericIcon,
    }
  )
}

/** Icon component for a crop name. */
export function cropIcon(cropType: string): ComponentType<IconProps> {
  return cropCatalogEntry(cropType).Icon
}

/** Catalogue order, used to sort whatever `GET /api/crop-types` returns. */
const orderByValue = new Map(CROP_CATALOG.map((entry, index) => [entry.value.toLowerCase(), index]))

export function cropCatalogOrder(cropType: string): number {
  return orderByValue.get(cropType.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER
}
