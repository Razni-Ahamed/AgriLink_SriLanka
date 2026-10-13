import { useTranslation } from 'react-i18next'
import { DownloadSimple, Images } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCropLabel } from '@/lib/useCropLabel'
import { useDownloadConfirmedPhotos, usePhotoDiagnosisSummary } from '../hooks/useAdminMetrics'

/**
 * How often each photo model agreed with the reviewing officer, and the officer-confirmed photos
 * as a labelled dataset for retraining (Sri Lankan field photos are what the models lack most).
 */
export function PhotoDiagnosisPanel() {
  const { t } = useTranslation('orders')
  const cropLabel = useCropLabel()
  const { data: summary, isLoading, isError } = usePhotoDiagnosisSummary()
  const download = useDownloadConfirmedPhotos()

  if (isLoading) {
    return <Skeleton className="h-40" />
  }

  if (isError || !summary) {
    return null
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconBadge tone="forest" className="shrink-0">
            <Images size={20} weight="duotone" />
          </IconBadge>
          <div>
            <h2 className="font-display text-lg text-text-primary">{t('admin.photoDiagnosis.title')}</h2>
            <p className="text-sm text-text-secondary">{t('admin.photoDiagnosis.subtitle')}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={download.isPending}
          disabled={summary.photosAvailable === 0}
          onClick={() => download.mutate()}
        >
          <DownloadSimple size={16} />
          {t('admin.photoDiagnosis.download', { count: summary.photosAvailable })}
        </Button>
      </div>

      {download.isError && (
        <p role="alert" className="text-sm text-state-danger">
          {t('admin.photoDiagnosis.downloadError')}
        </p>
      )}

      {summary.models.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('admin.photoDiagnosis.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-text-secondary">
              <tr>
                <th className="py-2 pr-3 font-medium">{t('admin.photoDiagnosis.crop')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.photoDiagnosis.reviewed')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.photoDiagnosis.agreed')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.photoDiagnosis.other')}</th>
                <th className="py-2 font-medium">{t('admin.photoDiagnosis.corrections')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.models.map((model) => (
                <tr key={`${model.crop}|${model.modelVersion}`} className="border-t border-brand-forest/10 align-top">
                  <td className="py-2 pr-3">
                    <p className="text-text-primary">{cropLabel(model.crop)}</p>
                    <p className="font-mono text-xs text-text-secondary">{model.modelVersion}</p>
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums">{model.reviewed}</td>
                  <td className="py-2 pr-3 font-mono tabular-nums">
                    {model.agreed} ({Math.round(model.agreementRate * 100)}%)
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums">{model.confirmedOther}</td>
                  <td className="py-2">
                    {model.topCorrections.length === 0 ? (
                      <span className="text-text-secondary">{t('admin.photoDiagnosis.noCorrections')}</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {model.topCorrections.map((correction) => (
                          <li key={`${correction.predictedKey}|${correction.confirmedKey}`}>
                            {t('admin.photoDiagnosis.correction', {
                              predicted: correction.predictedName,
                              confirmed: correction.confirmedName,
                              count: correction.count,
                            })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary">{t('admin.photoDiagnosis.privacy')}</p>
    </Card>
  )
}
