import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { UserProfileResponse } from '@/auth/api'
import { ProfileEditForm } from './ProfileEditForm'
import { ProfileSummary } from './ProfileSummary'

/**
 * Read-only by default, with one "Edit profile" button that turns just the editable fields into
 * inputs — rather than a separate "Update X" button per field.
 */
export function GeneralSettingsTab({ user }: { user: UserProfileResponse }) {
  const { t } = useTranslation('auth')
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return <ProfileEditForm user={user} onDone={() => setIsEditing(false)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileSummary user={user} />
      <div>
        <Button type="button" onClick={() => setIsEditing(true)}>
          {t('profile.edit.editProfile')}
        </Button>
      </div>
    </div>
  )
}
