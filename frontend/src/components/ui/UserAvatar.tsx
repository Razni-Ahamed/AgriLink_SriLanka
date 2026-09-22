import { useState, type ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { safePhotoUrl } from '@/lib/photoUrl'
import type { Role } from '@/types/common'
import {
  AdminAvatar,
  BuyerAvatar,
  FarmerAvatar,
  OfficerAvatar,
  type AvatarIllustrationProps,
} from './icons/avatars'

export type UserAvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface UserAvatarProps {
  /** The server-provided photo URL. Only an https:// URL is shown; anything else gets the default. */
  photoUrl?: string | null
  role: Role
  /** The person's name — the image's alt text. */
  name: string
  size?: UserAvatarSize
  className?: string
}

const SIZE_PX: Record<UserAvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 112,
}

const DEFAULT_AVATARS: Record<Role, ComponentType<AvatarIllustrationProps>> = {
  Farmer: FarmerAvatar,
  Buyer: BuyerAvatar,
  Officer: OfficerAvatar,
  Admin: AdminAvatar,
}

/**
 * A person's photo, or their role's default picture when they have none, it isn't a valid https
 * URL, or it fails to load. Shared by the header, profile, orders and admin screens.
 */
export function UserAvatar({ photoUrl, role, name, size = 'md', className }: UserAvatarProps) {
  const url = safePhotoUrl(photoUrl)
  // Keyed by URL rather than a boolean, so a new photo gets a fresh chance to load.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const px = SIZE_PX[size]

  if (url && url !== failedUrl) {
    return (
      <img
        src={url}
        alt={name}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(url)}
        className={cn('shrink-0 rounded-full bg-bg-canvas object-cover', className)}
        style={{ width: px, height: px }}
      />
    )
  }

  const DefaultAvatar = DEFAULT_AVATARS[role] ?? FarmerAvatar
  return (
    <span role="img" aria-label={name} className={cn('inline-flex shrink-0 rounded-full', className)}>
      <DefaultAvatar size={px} />
    </span>
  )
}
