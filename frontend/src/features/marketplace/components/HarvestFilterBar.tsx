import { useState } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CropTypeSelect } from '@/components/ui/CropTypeSelect'
import { DistrictSelect } from '@/components/ui/DistrictSelect'
import type { HarvestFilters } from '@/types/dto/harvests'

interface HarvestFilterBarProps {
  filters: HarvestFilters
  onChange: (filters: HarvestFilters) => void
  priceRange: { min: string; max: string }
  onPriceRangeChange: (range: { min: string; max: string }) => void
}

export function HarvestFilterBar({
  filters,
  onChange,
  priceRange,
  onPriceRangeChange,
}: HarvestFilterBarProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const [cropType, setCropType] = useState(filters.cropType ?? '')
  const [district, setDistrict] = useState(filters.district ?? '')

  // Crop type and district are both chosen from the same fixed lists the rest of the app
  // records them with. Typed filters could never match: the API stores canonical spellings,
  // so "tomatoe" — or even "tomato" — simply returned nothing with no hint why.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onChange({ cropType: cropType || undefined, district: district || undefined })
  }

  function handleReset() {
    setCropType('')
    setDistrict('')
    onPriceRangeChange({ min: '', max: '' })
    onChange({})
  }

  const hasFilters =
    Boolean(cropType) || Boolean(district) || Boolean(priceRange.min) || Boolean(priceRange.max)

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-forest/10 bg-bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <CropTypeSelect
        label={t('marketplace:filters.cropType')}
        value={cropType}
        onChange={setCropType}
        emptyOptionLabel={t('marketplace:filters.allCropTypes')}
      />
      <DistrictSelect
        label={t('marketplace:filters.district')}
        value={district}
        onChange={(event) => setDistrict(event.target.value)}
        emptyOptionLabel={t('marketplace:filters.allDistricts')}
      />
      <Input
        label={t('marketplace:filters.minPrice')}
        type="number"
        value={priceRange.min}
        onChange={(event) => onPriceRangeChange({ ...priceRange, min: event.target.value })}
      />
      <Input
        label={t('marketplace:filters.maxPrice')}
        type="number"
        value={priceRange.max}
        onChange={(event) => onPriceRangeChange({ ...priceRange, max: event.target.value })}
      />
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">
          <MagnifyingGlass size={16} weight="duotone" />
          {t('common:actions.search')}
        </Button>
        {hasFilters && (
          <Button type="button" variant="secondary" onClick={handleReset}>
            <X size={16} weight="bold" />
            <span className="sr-only">{t('marketplace:filters.clear')}</span>
          </Button>
        )}
      </div>
    </form>
  )
}
