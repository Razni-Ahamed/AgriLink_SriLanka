import type { ReactNode } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export interface SortOption {
  value: string
  label: string
}

interface SearchSortBarProps {
  search: string
  onSearchChange: (search: string) => void
  searchPlaceholder: string
  sort: string
  onSortChange: (sort: string) => void
  sortOptions: SortOption[]
  /** Extra filters (e.g. a status select) shown between the search box and the sort order. */
  children?: ReactNode
}

/** The search box, optional filters and sort order above a list. */
export function SearchSortBar({
  search,
  onSearchChange,
  searchPlaceholder,
  sort,
  onSortChange,
  sortOptions,
  children,
}: SearchSortBarProps) {
  const { t } = useTranslation('common')

  return (
    <div
      role="search"
      className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-brand-forest/10 bg-bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="relative sm:col-span-2">
        <Input
          type="search"
          label={t('actions.search')}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          maxLength={100}
          className="w-full pl-9"
        />
        <MagnifyingGlass
          size={16}
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-3 text-text-secondary"
        />
      </div>
      {children}
      <Select
        label={t('list.sortBy')}
        value={sort}
        onChange={(event) => onSortChange(event.target.value)}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
