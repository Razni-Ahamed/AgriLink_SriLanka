import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Disables both buttons — e.g. while the next page is still loading. */
  disabled?: boolean
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, disabled, className }: PaginationProps) {
  const { t } = useTranslation('common')

  const clampedTotalPages = Math.max(totalPages, 1)
  const canGoPrevious = page > 1
  const canGoNext = page < clampedTotalPages

  return (
    <nav
      aria-label={t('pagination.navigation')}
      className={cn('flex items-center justify-center gap-3', className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || !canGoPrevious}
        aria-label={t('pagination.previous')}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-brand-forest hover:bg-brand-forest/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <CaretLeft size={16} weight="bold" />
      </button>

      <span className="font-mono text-sm text-text-secondary" aria-live="polite">
        {t('pagination.pageOf', { page, totalPages: clampedTotalPages })}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || !canGoNext}
        aria-label={t('pagination.next')}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-brand-forest hover:bg-brand-forest/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <CaretRight size={16} weight="bold" />
      </button>
    </nav>
  )
}
