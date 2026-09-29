import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { HarvestCard } from '../components/HarvestCard'
import { HarvestFilterBar } from '../components/HarvestFilterBar'
import { useHarvests } from '../hooks/useHarvests'
import type { HarvestFilters } from '@/types/dto/harvests'

export function BrowseHarvestsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const [filters, setFilters] = useState<HarvestFilters>({ sort: 'newest' })
  // Search, price range and order are all applied by the API (GET /api/harvests).
  const { data: visibleHarvests, isLoading } = useHarvests(filters)
  const isFiltered = Boolean(
    filters.search || filters.cropType || filters.district || filters.minPrice || filters.maxPrice,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('browse.title')}</h1>
        <p className="text-sm text-text-secondary">{t('browse.subtitle')}</p>
      </div>

      <HarvestFilterBar filters={filters} onChange={setFilters} />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      )}

      {!isLoading && visibleHarvests && visibleHarvests.length === 0 && (
        <p className="text-sm text-text-secondary">
          {isFiltered ? t('common:list.noMatches') : t('browse.empty')}
        </p>
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
