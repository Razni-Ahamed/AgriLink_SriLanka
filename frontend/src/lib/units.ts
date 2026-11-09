import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { formatQuantity } from './utils'

/** What a listing's quantity and price are counted in (the API's QuantityUnit). */
export type QuantityUnit = 'Kg' | 'Piece' | 'Bunch' | 'Sack' | 'Crate'

export const QUANTITY_UNITS: readonly QuantityUnit[] = ['Kg', 'Piece', 'Bunch', 'Sack', 'Crate']

/** Anything the API didn't label (an old cached response) was priced per kg. */
function unitOrKg(unit: string | null | undefined): QuantityUnit {
  return QUANTITY_UNITS.includes(unit as QuantityUnit) ? (unit as QuantityUnit) : 'Kg'
}

/**
 * Writes quantities and prices with their unit, in the current language:
 * `quantity(3, 'Bunch')` → "3 bunches", `price(120, 'Kg')` → "Rs 120/kg".
 */
export function useUnits() {
  const { t } = useTranslation('common')

  const quantity = useCallback(
    (value: number, unit?: string | null) =>
      t(`units.quantity.${unitOrKg(unit)}`, { count: value, value: formatQuantity(value) }),
    [t],
  )
  const price = useCallback(
    (value: number, unit?: string | null) =>
      t('units.pricePer', { value: formatQuantity(value), unit: t(`units.per.${unitOrKg(unit)}`) }),
    [t],
  )
  /** "kg", "bunch" — for labels like "Price per bunch". */
  const per = useCallback((unit?: string | null) => t(`units.per.${unitOrKg(unit)}`), [t])
  /** "Kilograms (kg)", "Bunches" — for the unit picker. */
  const name = useCallback((unit: QuantityUnit) => t(`units.name.${unit}`), [t])

  return { quantity, price, per, name }
}
