import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Shown for an address that matches no page, and in place of a page that failed to render or to
 * load (for example, its code couldn't be downloaded on a dropped connection). Without it React
 * Router showed its developer error screen.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = error === undefined || (isRouteErrorResponse(error) && error.status === 404)
  return <ErrorMessage notFound={notFound} />
}

/** The `*` route: an address that matches no page. */
export function NotFoundPage() {
  return <ErrorMessage notFound />
}

function ErrorMessage({ notFound }: { notFound: boolean }) {
  const { t } = useTranslation(['common', 'auth'])

  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <h1 className="font-display text-2xl text-brand-forest">
        {notFound ? t('common:errors.notFound') : t('common:errors.generic')}
      </h1>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        {!notFound && (
          <Button type="button" onClick={() => window.location.reload()}>
            {t('common:actions.retry')}
          </Button>
        )}
        <Link to="/" className="text-brand-forest hover:underline">
          {t('auth:unauthorized.backHome')}
        </Link>
      </div>
    </div>
  )
}

/** What shows while a page's code downloads. */
export function PageLoading() {
  return (
    <div className="flex justify-center py-16 text-brand-forest">
      <Spinner size="lg" />
    </div>
  )
}
