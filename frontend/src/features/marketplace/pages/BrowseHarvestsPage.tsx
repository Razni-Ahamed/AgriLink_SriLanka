import { useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { BannerGlass, PhotoBanner } from '@/components/canopy/PhotoBanner'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { CROP_CATALOG, type CropGroup } from '@/lib/cropCatalog'
import { spring } from '@/lib/motion'
import { HarvestCard } from '../components/HarvestCard'
import { HarvestFilterBar } from '../components/HarvestFilterBar'
import { useHarvestPage } from '../hooks/useHarvests'
import type { HarvestFilters } from '@/types/dto/harvests'

type GroupChoice = 'all' | CropGroup

const GROUPS: GroupChoice[] = ['all', 'vegetables', 'fruit', 'cereals', 'roots', 'plantation']

/** The crop types in a group, sent to the API so the group narrows every page, not just one. */
function cropTypesIn(group: GroupChoice): string[] | undefined {
  return group === 'all'
    ? undefined
    : CROP_CATALOG.filter((entry) => entry.group === group).map((entry) => entry.value)
}

export function BrowseHarvestsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const [filters, setFilters] = useState<HarvestFilters>({ sort: 'newest' })
  const [group, setGroup] = useState<GroupChoice>('all')
  const listTop = useRef<HTMLDivElement>(null)

  // Back to page 1 whenever the filters or crop group change, without an effect: the page
  // belongs to the filters it was chosen under (the same pattern as the issue lists).
  const filterKey = JSON.stringify([filters, group])
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1

  // Search, crop group, price range and order are all applied by the API (GET /api/harvests),
  // which sends one page of listings at a time instead of the whole marketplace.
  const { data, isLoading, isFetching } = useHarvestPage(
    { ...filters, cropTypes: cropTypesIn(group) },
    page,
  )
  const visible = data?.items ?? []
  const isFiltered = Boolean(
    filters.search ||
    filters.cropType ||
    filters.district ||
    filters.minPrice ||
    filters.maxPrice ||
    group !== 'all',
  )

  function goToPage(next: number) {
    setPaging({ key: filterKey, page: next })
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

      <div ref={listTop} className="scroll-mt-24">
        <HarvestFilterBar filters={filters} onChange={setFilters} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-[26px]" />
          ))}
        </div>
      )}

      {!isLoading && data && (
        <p className="-mb-2 text-sm text-text-secondary tabular-nums">
          {t('common:list.showing', { shown: visible.length, total: data.totalCount })}
        </p>
      )}

      {!isLoading && data && visible.length === 0 && (
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

      {!isLoading && data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          disabled={isFetching}
        />
      )}
    </div>
  )
}
