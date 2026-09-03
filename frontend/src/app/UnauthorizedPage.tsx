import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function UnauthorizedPage() {
  const { t } = useTranslation('auth')

  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="font-display text-2xl text-brand-forest">{t('unauthorized.title')}</h1>
      <p className="text-text-secondary">{t('unauthorized.description')}</p>
      <Link to="/" className="mt-4 text-brand-forest hover:underline">
        {t('unauthorized.backHome')}
      </Link>
    </div>
  )
}
