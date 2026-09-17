import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, UserPlus } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { useAuthStore } from '@/auth/authStore'
import { formatDate } from '@/lib/utils'
import type { PendingRegistrationResponse } from '@/types/dto/registrations'
import {
  useApproveRegistration,
  usePendingRegistrations,
  useRejectRegistration,
} from '../hooks/useRegistrations'

export function PendingRegistrationsPage() {
  const { t } = useTranslation('registrations')
  const { data: applications, isLoading } = usePendingRegistrations()
  const role = useAuthStore((state) => state.role)
  const officerDistrict = useAuthStore((state) => state.user?.district)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('pending.title')}</h1>
        {/* Officers only ever receive Farmer applications from their own district here
            (RegistrationsController.Pending) — Buyer applications never reach an Officer. */}
        {role === 'Officer' && officerDistrict && (
          <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
            <MapPin size={14} />
            {t('pending.scopedToDistrict', { district: officerDistrict })}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      )}

      {!isLoading && applications && applications.length === 0 && (
        <p className="text-sm text-text-secondary">{t('pending.empty')}</p>
      )}

      {!isLoading && applications && applications.length > 0 && (
        <StaggerList className="flex flex-col gap-3">
          {applications.map((application) => (
            <StaggerList.Item key={application.userId}>
              <ApplicationCard application={application} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}

function ApplicationCard({ application }: { application: PendingRegistrationResponse }) {
  const { t } = useTranslation('registrations')
  const [isRejecting, setIsRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()

  const isFarmer = application.role === 'Farmer'

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge tone={isFarmer ? 'forest' : 'harvest'} className="shrink-0">
            <UserPlus size={18} weight="duotone" />
          </IconBadge>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base text-text-primary">
              {application.fullName}
            </h3>
            <p className="truncate text-xs text-text-secondary">{application.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={isFarmer ? 'info' : 'neutral'}>
            {isFarmer ? t('pending.farmerLabel') : t('pending.buyerLabel')}
          </Badge>
          <span className="text-xs text-text-secondary">
            {t('pending.appliedOn', { date: formatDate(application.createdAt) })}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
        <div>{t('pending.district', { district: application.district })}</div>
        {application.nic && <div>{t('pending.nic', { nic: application.nic })}</div>}
        {isFarmer ? (
          <>
            <div>{t('pending.fieldPlot', { plot: application.fieldPlotNumber })}</div>
            <div>{t('pending.phone', { phone: application.phoneNumber })}</div>
          </>
        ) : (
          <>
            <div>{t('pending.legalName', { name: application.legalBusinessName })}</div>
            <div>{t('pending.businessReg', { value: application.businessRegistrationNumber })}</div>
            <div>{t('pending.businessPhone', { value: application.businessPhone })}</div>
          </>
        )}
      </dl>

      {isRejecting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            label={t('pending.rejectPrompt')}
            placeholder={t('pending.rejectPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsRejecting(false)}>
              {t('pending.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim() || reject.isPending}
              onClick={() => reject.mutate({ userId: application.userId, request: { reason } })}
            >
              {t('pending.rejectSubmit')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsRejecting(true)}>
            {t('pending.reject')}
          </Button>
          <Button disabled={approve.isPending} onClick={() => approve.mutate(application.userId)}>
            {t('pending.approve')}
          </Button>
        </div>
      )}
    </Card>
  )
}
