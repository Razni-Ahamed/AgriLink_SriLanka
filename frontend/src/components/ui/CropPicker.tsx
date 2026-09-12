import { useTranslation } from 'react-i18next'
import { IconSelect, type IconSelectOption } from './IconSelect'
import { cropIcon } from '@/lib/cropCatalog'
import { useCropLabel } from '@/lib/useCropLabel'
import type { FarmerCropSummary } from '@/types/dto/crops'

interface CropPickerProps {
  crops: FarmerCropSummary[]
  isLoading?: boolean
  value: number | undefined
  onChange: (cropId: number | undefined) => void
  label?: string
  error?: string
  disabled?: boolean
}

/**
 * Picks one of the farmer's own crops. Every flow that hangs off a crop — reporting an issue,
 * listing a harvest — used to want the crop's database id: "New Listing" literally asked the
 * farmer to type a number they had no way of knowing. Each option is labelled with the crop and
 * the field/farm it sits in, so the id never surfaces.
 */
export function CropPicker({
  crops,
  isLoading,
  value,
  onChange,
  label,
  error,
  disabled,
}: CropPickerProps) {
  const { t } = useTranslation('common')
  const cropLabel = useCropLabel()

  const options: IconSelectOption[] = crops.map((crop) => {
    const Icon = cropIcon(crop.cropType)
    const label = cropLabel(crop.cropType)
    return {
      value: String(crop.cropId),
      label: crop.variety ? `${label} — ${crop.variety}` : label,
      hint: t('fields.cropLocation', { field: crop.fieldName, farm: crop.farmName }),
      icon: <Icon size={18} />,
    }
  })

  return (
    <IconSelect
      label={label ?? t('fields.crop')}
      error={error}
      value={value === undefined ? '' : String(value)}
      onChange={(next) => onChange(next ? Number(next) : undefined)}
      options={options}
      disabled={disabled || isLoading}
      placeholder={isLoading ? t('actions.loading') : t('fields.selectCrop')}
    />
  )
}
