import { useState } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CropTypeSelect } from '@/components/ui/CropTypeSelect'
import { DistrictSelect } from '@/components/ui/DistrictSelect'
import { Select } from '@/components/ui/Select'
import type { HarvestFilters, HarvestSort } from '@/types/dto/harvests'

interface HarvestFilterBarProps {
  filters: HarvestFilters
  onChange: (filters: HarvestFilters) => void
}

function toPrice(value: string): number | undefined {
  const price = Number(value)
  return value.trim() !== '' && Number.isFinite(price) && price >= 0 ? price : undefined
}

export function HarvestFilterBar({ filters, onChange }: HarvestFilterBarProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const [search, setSearch] = useState(filters.search ?? '')
  const [cropType, setCropType] = useState(filters.cropType ?? '')
  const [district, setDistrict] = useState(filters.district ?? '')
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? '')
  const sort = filters.sort ?? 'newest'

  // Crop type and district are both chosen from the same fixed lists the rest of the app
  // records them with. Typed filters could never match: the API stores canonical spellings,
  // so "tomatoe" — or even "tomato" — simply returned nothing with no hint why. The free-text
  // search is for everything else: a variety, a town, part of a crop name.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onChange({
      search: search.trim() || undefined,
      cropType: cropType || undefined,
      district: district || undefined,
      minPrice: toPrice(minPrice),
      maxPrice: toPrice(maxPrice),
      sort: filters.sort,
    })
  }

  function handleReset() {
    setSearch('')
    setCropType('')
    setDistrict('')
    setMinPrice('')
    setMaxPrice('')
    onChange({ sort: filters.sort })
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(cropType) ||
    Boolean(district) ||
    Boolean(minPrice) ||
    Boolean(maxPrice)

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-brand-forest/10 bg-bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <Input
          type="search"
          label={t('common:actions.search')}
          placeholder={t('common:list.searchListings')}
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
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
        min={0}
        value={minPrice}
        onChange={(event) => setMinPrice(event.target.value)}
      />
      <Input
        label={t('marketplace:filters.maxPrice')}
        type="number"
        min={0}
        value={maxPrice}
        onChange={(event) => setMaxPrice(event.target.value)}
      />
      {/* The order applies straight away; the filters wait for Search. */}
      <Select
        label={t('common:list.sortBy')}
        value={sort}
        onChange={(event) => onChange({ ...filters, sort: event.target.value as HarvestSort })}
      >
        <option value="newest">{t('common:list.newest')}</option>
        <option value="priceAsc">{t('common:list.priceAsc')}</option>
        <option value="priceDesc">{t('common:list.priceDesc')}</option>
        <option value="quantityDesc">{t('common:list.quantityDesc')}</option>
        <option value="freshest">{t('common:list.freshest')}</option>
      </Select>
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
