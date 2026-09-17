import { useEffect, useState } from 'react'
import { ImageBroken } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/Skeleton'
import type { IssuePhoto } from '@/types/dto/advisories'
import { getIssuePhoto } from '../api/issuesApi'

type LoadResult = { source: string; objectUrl: string } | { source: string; failed: true }

function AuthenticatedPhoto({ photo }: { photo: IssuePhoto }) {
  const { t } = useTranslation('issues')
  // Tagged with the URL it was loaded for, so a result for a previous photo is never shown.
  const [result, setResult] = useState<LoadResult | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let url: string | null = null

    getIssuePhoto(photo.url, controller.signal)
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setResult({ source: photo.url, objectUrl: url })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ source: photo.url, failed: true })
        }
      })

    return () => {
      controller.abort()
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [photo.url])

  const current = result?.source === photo.url ? result : null
  const failed = current !== null && 'failed' in current
  const objectUrl = current !== null && 'objectUrl' in current ? current.objectUrl : null

  if (failed) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 rounded-xl bg-bg-canvas text-sm text-text-secondary">
        <ImageBroken size={18} weight="duotone" />
        {t('advisory.photoUnavailable')}
      </div>
    )
  }

  if (!objectUrl) {
    return <Skeleton className="h-40" />
  }

  return (
    <a href={objectUrl} target="_blank" rel="noreferrer">
      <img
        src={objectUrl}
        alt={t('advisory.photoAlt')}
        width={photo.width || undefined}
        height={photo.height || undefined}
        className="max-h-80 w-full rounded-xl border border-text-secondary/20 object-contain"
      />
    </a>
  )
}

/** Photos attached to an issue. Their URLs need the signed-in user's token, so each is fetched
 *  through the API client rather than loaded by the browser directly. */
export function IssuePhotoGallery({ photos }: { photos: IssuePhoto[] }) {
  const { t } = useTranslation('issues')

  if (photos.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-secondary">{t('advisory.photos')}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {photos.map((photo) => (
          <AuthenticatedPhoto key={photo.imageId} photo={photo} />
        ))}
      </div>
    </div>
  )
}
