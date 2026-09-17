import { isAxiosError } from 'axios'

/**
 * Which message to show when reporting an issue fails. With a photo attached, the API answers 400
 * for a photo it cannot use and 503 when photo storage is down — both worth telling the farmer
 * specifically, since reporting without the photo would still work.
 */
export function reportErrorKey(error: unknown, hadPhoto: boolean) {
  const status = isAxiosError(error) ? error.response?.status : undefined
  if (hadPhoto && status === 400) return 'issues:new.photoRejected' as const
  if (hadPhoto && status === 503) return 'issues:new.photoUploadUnavailable' as const
  return 'issues:new.reportError' as const
}
