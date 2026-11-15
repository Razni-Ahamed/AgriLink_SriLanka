import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Sri Lanka's 25 administrative districts, by the spelling the API stores, mapped to their
 * translation keys. Listed out (rather than built from the name) so each key is type-checked.
 */
const DISTRICT_LABEL_KEYS = {
  Ampara: 'districts.Ampara',
  Anuradhapura: 'districts.Anuradhapura',
  Badulla: 'districts.Badulla',
  Batticaloa: 'districts.Batticaloa',
  Colombo: 'districts.Colombo',
  Galle: 'districts.Galle',
  Gampaha: 'districts.Gampaha',
  Hambantota: 'districts.Hambantota',
  Jaffna: 'districts.Jaffna',
  Kalutara: 'districts.Kalutara',
  Kandy: 'districts.Kandy',
  Kegalle: 'districts.Kegalle',
  Kilinochchi: 'districts.Kilinochchi',
  Kurunegala: 'districts.Kurunegala',
  Mannar: 'districts.Mannar',
  Matale: 'districts.Matale',
  Matara: 'districts.Matara',
  Monaragala: 'districts.Monaragala',
  Mullaitivu: 'districts.Mullaitivu',
  'Nuwara Eliya': 'districts.NuwaraEliya',
  Polonnaruwa: 'districts.Polonnaruwa',
  Puttalam: 'districts.Puttalam',
  Ratnapura: 'districts.Ratnapura',
  Trincomalee: 'districts.Trincomalee',
  Vavuniya: 'districts.Vavuniya',
} as const

type DistrictLabelKey = (typeof DISTRICT_LABEL_KEYS)[keyof typeof DISTRICT_LABEL_KEYS]

/**
 * A district's name in the current language. The API always sends and expects the English
 * spelling, so this is for showing a district only: form values stay as the API wrote them.
 * A name it doesn't know comes back unchanged.
 */
export function useDistrictLabel() {
  const { t } = useTranslation('common')

  return useCallback(
    (district: string): string => {
      const keys: Record<string, DistrictLabelKey | undefined> = DISTRICT_LABEL_KEYS
      const key = keys[district]
      return key ? t(key) : district
    },
    [t],
  )
}
