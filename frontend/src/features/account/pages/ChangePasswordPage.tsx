import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { ChangePasswordPanel } from '../components/ChangePasswordPanel'

/** Reachable by every role, including Admin — AdminLoginPage signs into a separate entry point,
 *  but from there on the admin shares this same layout and account settings. */
export function ChangePasswordPage() {
  const { t } = useTranslation(['auth', 'common'])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('auth:changePassword.title')}</h1>
        <p className="text-sm text-text-secondary">{t('auth:changePassword.subtitle')}</p>
      </div>

      <Card className="max-w-sm">
        <ChangePasswordPanel />
      </Card>
    </div>
  )
}
