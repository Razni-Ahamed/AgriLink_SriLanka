import { useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { HarvestCard } from '../components/HarvestCard'
import { HarvestFilterBar } from '../components/HarvestFilterBar'
import { useHarvests } from '../hooks/useHarvests'
import type { HarvestFilters } from '@/types/dto/harvests'

export function BrowseHarvestsPage() {
  const [filters, setFilters] = useState<HarvestFilters>({})
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const { data: harvests, isLoading } = useHarvests(filters)

  const visibleHarvests = useMemo(() => {
    if (!harvests) return harvests
    const min = priceRange.min ? Number(priceRange.min) : undefined
    const max = priceRange.max ? Number(priceRange.max) : undefined
    return harvests.filter((harvest) => {
      if (min !== undefined && harvest.pricePerUnit < min) return false
      if (max !== undefined && harvest.pricePerUnit > max) return false
      return true
    })
  }, [harvests, priceRange])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">Harvest Marketplace</h1>
        <p className="text-sm text-text-secondary">
          Fresh produce straight from Sri Lankan farms — browse active listings below.
        </p>
      </div>

      <HarvestFilterBar
        filters={filters}
        onChange={setFilters}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      )}

      {!isLoading && visibleHarvests && visibleHarvests.length === 0 && (
        <p className="text-sm text-text-secondary">No listings match your filters right now.</p>
      )}

      {!isLoading && visibleHarvests && visibleHarvests.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleHarvests.map((harvest) => (
            <StaggerList.Item key={harvest.harvestId}>
              <HarvestCard harvest={harvest} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
