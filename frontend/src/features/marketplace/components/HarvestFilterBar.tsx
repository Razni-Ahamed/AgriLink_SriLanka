import { useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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
  const [cropType, setCropType] = useState(filters.cropType ?? '')
  const [district, setDistrict] = useState(filters.district ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onChange({ cropType: cropType.trim() || undefined, district: district.trim() || undefined })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-forest/10 bg-bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <Input
        label="Crop type"
        placeholder="e.g. Tea"
        value={cropType}
        onChange={(event) => setCropType(event.target.value)}
      />
      <Input
        label="District"
        placeholder="e.g. Nuwara Eliya"
        value={district}
        onChange={(event) => setDistrict(event.target.value)}
      />
      <Input
        label="Min price/unit"
        type="number"
        value={priceRange.min}
        onChange={(event) => onPriceRangeChange({ ...priceRange, min: event.target.value })}
      />
      <Input
        label="Max price/unit"
        type="number"
        value={priceRange.max}
        onChange={(event) => onPriceRangeChange({ ...priceRange, max: event.target.value })}
      />
      <Button type="submit" className="self-end">
        <MagnifyingGlass size={16} weight="duotone" />
        Search
      </Button>
    </form>
  )
}
