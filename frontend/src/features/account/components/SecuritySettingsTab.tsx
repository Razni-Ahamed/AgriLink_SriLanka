import { useTranslation } from 'react-i18next'
import { ChangePasswordPanel } from './ChangePasswordPanel'

/** For now just the existing password change, so it keeps working from the pop-up. Part B
 *  replaces this tab's contents. */
export function SecuritySettingsTab() {
  const { t } = useTranslation('auth')

  return (
    <section className="flex max-w-sm flex-col gap-3">
      <div>
        <h3 className="font-display text-base text-text-primary">{t('profile.security.passwordHeading')}</h3>
        <p className="text-sm text-text-secondary">{t('changePassword.subtitle')}</p>
      </div>
      <ChangePasswordPanel />
    </section>
  )
}
