import type { UserProfileResponse } from '@/auth/api'
import { ProfileSummary } from './ProfileSummary'

export function GeneralSettingsTab({ user }: { user: UserProfileResponse }) {
  return <ProfileSummary user={user} />
}
