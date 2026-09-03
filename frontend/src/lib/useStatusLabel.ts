import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Status values arrive from the API as plain strings, so they're mapped to
 * translation keys explicitly here. An unrecognized value falls back to the
 * raw string rather than rendering a missing-key placeholder.
 */
const STATUS_KEYS = {
  crop: {
    Seeded: 'status.crop.Seeded',
    Growing: 'status.crop.Growing',
    Harvested: 'status.crop.Harvested',
  },
  harvest: {
    Active: 'status.harvest.Active',
    Sold: 'status.harvest.Sold',
    Cancelled: 'status.harvest.Cancelled',
  },
  request: {
    Pending: 'status.request.Pending',
    Accepted: 'status.request.Accepted',
    Declined: 'status.request.Declined',
    Cancelled: 'status.request.Cancelled',
  },
  order: {
    Confirmed: 'status.order.Confirmed',
    Completed: 'status.order.Completed',
    Cancelled: 'status.order.Cancelled',
  },
  issue: {
    Pending: 'status.issue.Pending',
    AwaitingReview: 'status.issue.AwaitingReview',
    Resolved: 'status.issue.Resolved',
    Rejected: 'status.issue.Rejected',
  },
  advisory: {
    Draft: 'status.advisory.Draft',
    Approved: 'status.advisory.Approved',
    Rejected: 'status.advisory.Rejected',
  },
  severity: {
    Low: 'severity.Low',
    Medium: 'severity.Medium',
    High: 'severity.High',
  },
  risk: {
    Low: 'risk.Low',
    Medium: 'risk.Medium',
    High: 'risk.High',
  },
} as const

type ValueOf<T> = T[keyof T]

type StatusKind = keyof typeof STATUS_KEYS

type StatusTranslationKey = ValueOf<{
  [K in StatusKind]: ValueOf<(typeof STATUS_KEYS)[K]>
}>

export function useStatusLabel() {
  const { t } = useTranslation('common')

  return useCallback(
    (kind: StatusKind, value: string): string => {
      const keys: Record<string, StatusTranslationKey | undefined> = STATUS_KEYS[kind]
      const key = keys[value]
      return key ? t(key) : value
    },
    [t],
  )
}
