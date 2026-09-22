import { AvatarBadge, type AvatarIllustrationProps } from './AvatarBadge'

/** Default Officer picture: the checked shield, echoing OfficerBadgeIcon. */
export function OfficerAvatar(props: AvatarIllustrationProps) {
  return (
    <AvatarBadge toneClassName="text-state-info" {...props}>
      <path d="M24 12l10 4v7c0 7-4.3 11.6-10 13.5-5.7-1.9-10-6.5-10-13.5v-7Z" />
      <path d="M19.5 24l3 3 6-6" />
    </AvatarBadge>
  )
}
