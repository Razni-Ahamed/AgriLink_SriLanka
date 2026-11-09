import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { UserProfileResponse } from '@/auth/api'
import { ProfileEditForm } from './ProfileEditForm'
import { ProfileSummary } from './ProfileSummary'

/**
 * Read-only by default, with one "Edit profile" button that turns just the editable fields into
 * inputs — rather than a separate "Update X" button per field. The light/dark setting lives here
 * too, so the signed-in header keeps only what people reach for often.
 */
export function GeneralSettingsTab({ user }: { user: UserProfileResponse }) {
  const { t } = useTranslation(['auth', 'common'])
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return <ProfileEditForm user={user} onDone={() => setIsEditing(false)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileSummary user={user} />
      <div>
        <Button type="button" onClick={() => setIsEditing(true)}>
          {t('auth:profile.edit.editProfile')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-forest/10 pt-5">
        <p className="text-sm font-medium text-text-primary">{t('common:theme.label')}</p>
        <ThemeToggle />
      </div>
    </div>
  )
}
