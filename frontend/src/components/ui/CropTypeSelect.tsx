import { useTranslation } from 'react-i18next'
import { IconSelect, type IconSelectOption } from './IconSelect'
import { cropCatalogEntry } from '@/lib/cropCatalog'
import { useCropLabel, useCropGroupLabel } from '@/lib/useCropLabel'
import { useCropTypes } from '@/lib/useCropTypes'

interface CropTypeSelectProps {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
  /** Adds a leading "any crop type" option that selects `''`, for filter bars. */
  emptyOptionLabel?: string
  disabled?: boolean
  name?: string
}

/**
 * The single place a crop type is chosen. Options come from `GET /api/crop-types` (the same
 * list the API validates against) and each carries its catalogue icon, so a crop is picked,
 * never typed — a typo used to mint a whole new marketplace category.
 */
export function CropTypeSelect({
  label,
  error,
  value,
  onChange,
  emptyOptionLabel,
  disabled,
  name,
}: CropTypeSelectProps) {
  const { t } = useTranslation('common')
  const cropLabel = useCropLabel()
  const groupLabel = useCropGroupLabel()
  const { data: cropTypes, isLoading } = useCropTypes()

  const options: IconSelectOption[] = (cropTypes ?? []).map((cropType) => {
    const { group, Icon } = cropCatalogEntry(cropType)
    return {
      value: cropType,
      label: cropLabel(cropType),
      icon: <Icon size={18} />,
      group: groupLabel(group),
    }
  })

  return (
    <IconSelect
      label={label ?? t('fields.cropType')}
      error={error}
      value={value}
      onChange={onChange}
      options={options}
      emptyOptionLabel={emptyOptionLabel}
      disabled={disabled || isLoading}
      placeholder={isLoading ? t('actions.loading') : t('fields.selectCropType')}
      name={name}
    />
  )
}
