import { AvatarBadge, type AvatarIllustrationProps } from './AvatarBadge'

/** Default Admin picture: a key — the account that grants everyone else access. Neutral, like the
 *  Admin role badge in the user table. */
export function AdminAvatar(props: AvatarIllustrationProps) {
  return (
    <AvatarBadge toneClassName="text-text-primary" {...props}>
      <circle cx="18.5" cy="24" r="5.5" />
      <path d="M24 24h11" />
      <path d="M31 24v4.5M35 24v3" />
    </AvatarBadge>
  )
}
