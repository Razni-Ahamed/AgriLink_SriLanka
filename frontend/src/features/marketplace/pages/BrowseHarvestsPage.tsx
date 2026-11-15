import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { BannerGlass, PhotoBanner } from '@/components/canopy/PhotoBanner'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Skeleton } from '@/components/ui/Skeleton'
import { cropCatalogEntry, type CropGroup } from '@/lib/cropCatalog'
import { spring } from '@/lib/motion'
import { HarvestCard } from '../components/HarvestCard'
import { HarvestFilterBar } from '../components/HarvestFilterBar'
import { useHarvests } from '../hooks/useHarvests'
import type { HarvestFilters } from '@/types/dto/harvests'

type GroupChoice = 'all' | CropGroup

const GROUPS: GroupChoice[] = ['all', 'vegetables', 'fruit', 'cereals', 'roots', 'plantation']

export function BrowseHarvestsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const [filters, setFilters] = useState<HarvestFilters>({ sort: 'newest' })
  const [group, setGroup] = useState<GroupChoice>('all')
  // Search, price range and order are all applied by the API (GET /api/harvests); the crop group
  // chips narrow what came back, instantly, on this page.
  const { data: harvests, isLoading } = useHarvests(filters)
  const isFiltered = Boolean(
    filters.search ||
    filters.cropType ||
    filters.district ||
    filters.minPrice ||
    filters.maxPrice ||
    group !== 'all',
  )

  const visible = useMemo(
    () =>
      (harvests ?? []).filter(
        (harvest) => group === 'all' || cropCatalogEntry(harvest.cropType).group === group,
      ),
    [harvests, group],
  )

  const groupOptions = GROUPS.map((value) => ({
    value,
    label:
      value === 'all' ? t('marketplace:filters.allCropTypes') : t(`common:cropGroups.${value}`),
  }))

  return (
    <div className="flex flex-col gap-6">
      <PhotoBanner
        photo="market"
        focus="center 60%"
        title={t('browse.title')}
        subtitle={t('browse.subtitle')}
      >
        <BannerGlass className="overflow-x-auto p-1.5 [scrollbar-width:none]">
          <ChipGroup<GroupChoice>
            label={t('marketplace:filters.cropType')}
            options={groupOptions}
            value={group}
            onChange={setGroup}
            className="w-max border-0 bg-transparent p-0 [&_button:not([aria-pressed=true])]:text-white/80 [&_button:not([aria-pressed=true]):hover]:bg-white/10 [&_button:not([aria-pressed=true]):hover]:text-white"
          />
        </BannerGlass>
      </PhotoBanner>

      <HarvestFilterBar filters={filters} onChange={setFilters} />

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-[26px]" />
          ))}
        </div>
      )}

      {!isLoading && harvests && (
        <p className="-mb-2 text-sm text-text-secondary tabular-nums">
          {t('common:list.showing', { shown: visible.length, total: harvests.length })}
        </p>
      )}

      {!isLoading && harvests && visible.length === 0 && (
        <p className="rounded-[22px] border border-dashed border-text-primary/15 p-8 text-center text-sm text-text-secondary">
          {isFiltered ? t('common:list.noMatches') : t('browse.empty')}
        </p>
      )}

      {!isLoading && visible.length > 0 && (
        <LayoutGroup>
          <motion.ul
            layout
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((harvest, index) => (
                <motion.li
                  key={harvest.harvestId}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ ...spring.move, delay: Math.min(index, 8) * 0.03 }}
                >
                  <HarvestCard harvest={harvest} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>
      )}
    </div>
  )
}
