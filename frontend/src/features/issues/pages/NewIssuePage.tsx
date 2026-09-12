import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { CropPicker } from '@/components/ui/CropPicker'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { FadeIn } from '@/components/ui/motion/FadeIn'
import { FlashOnSuccess } from '@/components/ui/motion/FlashOnSuccess'
import { useCropLabel } from '@/lib/useCropLabel'
import { useUiStore } from '@/lib/useUiStore'
import { useMyCrops } from '@/features/farms/hooks/useCrops'
import { IssueForm } from '../components/IssueForm'
import { useCreateIssue } from '../hooks/useIssues'

export function NewIssuePage() {
  const { t } = useTranslation(['issues', 'common'])
  const cropLabel = useCropLabel()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const createIssue = useCreateIssue()
  const [submitted, setSubmitted] = useState(false)

  const { data: crops, isLoading: isLoadingCrops } = useMyCrops()

  // A crop can arrive from the crop detail page's "Report Issue" button; when it doesn't, the
  // farmer picks one here. This page used to dead-end with "no crop selected" whenever it was
  // opened directly, which made the whole flow unreachable from "My Issues".
  const prefilledCropId = searchParams.get('cropId')
  const [selectedCropId, setSelectedCropId] = useState<number | undefined>(
    prefilledCropId ? Number(prefilledCropId) : undefined,
  )

  if (isLoadingCrops) {
    return <Skeleton className="h-64" />
  }

  // No crops at all: an issue is always about a crop, so send them to plant one first.
  if (!crops || crops.length === 0) {
    return (
      <FadeIn>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <IconBadge tone="terracotta">
            <Warning size={20} weight="duotone" />
          </IconBadge>
          <p className="text-text-primary">{t('issues:new.noCrop')}</p>
          <Link to="/farms" className="text-sm font-medium text-brand-forest hover:underline">
            {t('issues:new.goToFarms')}
          </Link>
        </Card>
      </FadeIn>
    )
  }

  const selectedCrop = crops.find((crop) => crop.cropId === selectedCropId)

  return (
    <FadeIn>
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl text-text-primary">{t('issues:new.title')}</h1>

        <FlashOnSuccess trigger={submitted}>
          <Card className="flex flex-col gap-6">
            <CropPicker
              crops={crops}
              value={selectedCropId}
              onChange={setSelectedCropId}
              label={t('issues:new.whichCrop')}
            />

            {selectedCrop && (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-forest/10 bg-brand-forest/5 p-3">
                <IconBadge tone="forest">
                  <CropIcon cropType={selectedCrop.cropType} size={20} />
                </IconBadge>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-text-primary">
                    {cropLabel(selectedCrop.cropType)}
                    {selectedCrop.variety && (
                      <span className="text-text-secondary"> · {selectedCrop.variety}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {t('common:fields.cropLocation', {
                      field: selectedCrop.fieldName,
                      farm: selectedCrop.farmName,
                    })}
                  </p>
                </div>
              </div>
            )}

            {selectedCropId === undefined ? (
              <p className="text-sm text-text-secondary">{t('issues:new.pickCropFirst')}</p>
            ) : (
              <IssueForm
                cropId={selectedCropId}
                isSubmitting={createIssue.isPending}
                onSubmit={(values) =>
                  createIssue.mutate(values, {
                    onSuccess: () => {
                      setSubmitted(true)
                      addToast({ type: 'success', message: t('issues:new.reported') })
                      setTimeout(() => navigate('/issues/mine'), 500)
                    },
                    onError: () =>
                      addToast({ type: 'error', message: t('issues:new.reportError') }),
                  })
                }
              />
            )}
          </Card>
        </FlashOnSuccess>
      </div>
    </FadeIn>
  )
}
