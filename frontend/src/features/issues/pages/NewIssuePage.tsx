import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { PhotoBanner } from '@/components/canopy/PhotoBanner'
import { Card } from '@/components/ui/Card'
import { CropPicker } from '@/components/ui/CropPicker'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cropPhoto } from '@/lib/cropPhotos'
import { spring } from '@/lib/motion'
import { useCropLabel } from '@/lib/useCropLabel'
import { useUiStore } from '@/lib/useUiStore'
import { useMyCrops } from '@/features/farms/hooks/useCrops'
import { IssueForm } from '../components/IssueForm'
import { ReportProgress } from '../components/ReportProgress'
import { useCreateIssue } from '../hooks/useIssues'
import { useOutboxOwner } from '../hooks/useIssueOutbox'
import { isConnectionFailure, queueIssueReport } from '../lib/issueOutbox'
import { reportErrorKey } from '../lib/reportErrorKey'
import type { CreateCropIssueRequest } from '@/types/dto/issues'

interface Sending {
  photoUrl: string
  /** An object URL made for the farmer's own photo, to release afterwards. */
  ownPhoto: boolean
  done: boolean
}

/**
 * Reporting a crop problem. The banner shows the crop being reported; once sent, the form gives
 * way to the farmer's photo with a scan line and steps ticking off while the server works (about
 * half a minute). The form stays mounted underneath, so nothing typed is lost if sending fails.
 */
export function NewIssuePage() {
  const { t } = useTranslation(['issues', 'common'])
  const cropLabel = useCropLabel()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const createIssue = useCreateIssue()
  const [sending, setSending] = useState<Sending | null>(null)
  const outboxOwner = useOutboxOwner()

  /** Keeps the report on the phone to send when the signal returns. False if it couldn't be kept. */
  async function saveForLater(values: CreateCropIssueRequest): Promise<boolean> {
    if (!outboxOwner) return false
    try {
      await queueIssueReport(outboxOwner, values)
    } catch {
      return false
    }
    addToast({ type: 'info', message: t('issues:new.queued') })
    navigate('/issues/mine')
    return true
  }

  const { data: crops, isLoading: isLoadingCrops } = useMyCrops()

  // A crop can arrive from the crop detail page's "Report Issue" button; when it doesn't, the
  // farmer picks one here. This page used to dead-end with "no crop selected" whenever it was
  // opened directly, which made the whole flow unreachable from "My Issues".
  const prefilledCropId = searchParams.get('cropId')
  const [selectedCropId, setSelectedCropId] = useState<number | undefined>(
    prefilledCropId ? Number(prefilledCropId) : undefined,
  )

  // Release the object URL made for the farmer's photo.
  useEffect(
    () => () => {
      if (sending?.ownPhoto) URL.revokeObjectURL(sending.photoUrl)
    },
    [sending],
  )

  if (isLoadingCrops) {
    return <Skeleton className="h-64 rounded-[28px]" />
  }

  // No crops at all: an issue is always about a crop, so send them to plant one first.
  if (!crops || crops.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <IconBadge tone="terracotta">
          <Warning size={20} weight="duotone" />
        </IconBadge>
        <p className="text-text-primary">{t('issues:new.noCrop')}</p>
        <Link to="/farms" className="text-sm font-medium text-brand-forest hover:underline">
          {t('issues:new.goToFarms')}
        </Link>
      </Card>
    )
  }

  const selectedCrop = crops.find((crop) => crop.cropId === selectedCropId)

  return (
    <div className="flex flex-col gap-6">
      <PhotoBanner
        size="compact"
        photo={selectedCrop ? cropPhoto(selectedCrop.cropType) : 'inspection'}
        focus={selectedCrop ? 'center' : 'center 82%'}
        back={{ to: '/issues/mine', label: t('issues:mine.title') }}
        eyebrow={
          selectedCrop
            ? `${cropLabel(selectedCrop.cropType)}${selectedCrop.variety ? ` · ${selectedCrop.variety}` : ''} · ${t('common:fields.cropLocation', { field: selectedCrop.fieldName, farm: selectedCrop.farmName })}`
            : undefined
        }
        title={t('issues:new.title')}
      />

      <div className="mx-auto w-full max-w-2xl">
        {sending && (
          <motion.div
            className="glass rounded-[28px] p-5 sm:p-7"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.reveal}
          >
            <ReportProgress
              photoUrl={sending.photoUrl}
              hasPhoto={sending.ownPhoto}
              done={sending.done}
            />
          </motion.div>
        )}

        <Card className="flex flex-col gap-6 rounded-[28px] p-5 sm:p-7" hidden={sending !== null}>
          <CropPicker
            crops={crops}
            value={selectedCropId}
            onChange={setSelectedCropId}
            label={t('issues:new.whichCrop')}
          />

          {selectedCropId === undefined ? (
            <p className="text-sm text-text-secondary">{t('issues:new.pickCropFirst')}</p>
          ) : (
            <IssueForm
              cropId={selectedCropId}
              isSubmitting={createIssue.isPending}
              onSubmit={(values) => {
                const ownPhoto = Boolean(values.photo)
                // No signal: don't make the farmer wait on a request that can't go. The report is
                // kept and sent when the connection returns (IssueOutboxSync).
                if (!navigator.onLine) {
                  void saveForLater(values).then((saved) => {
                    if (!saved) addToast({ type: 'error', message: t('issues:new.reportError') })
                  })
                  return
                }
                setSending({
                  photoUrl: values.photo
                    ? URL.createObjectURL(values.photo)
                    : cropPhoto(selectedCrop?.cropType ?? 'Other'),
                  ownPhoto,
                  done: false,
                })
                createIssue.mutate(values, {
                  onSuccess: () => {
                    setSending((current) => current && { ...current, done: true })
                    addToast({ type: 'success', message: t('issues:new.reported') })
                    setTimeout(() => navigate('/issues/mine'), 1200)
                  },
                  onError: (error) => {
                    setSending(null)
                    const showError = () =>
                      addToast({ type: 'error', message: t(reportErrorKey(error, ownPhoto)) })
                    // The signal dropped on the way: keep the report rather than lose it.
                    if (isConnectionFailure(error)) {
                      void saveForLater(values).then((saved) => saved || showError())
                    } else {
                      showError()
                    }
                  },
                })
              }}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
