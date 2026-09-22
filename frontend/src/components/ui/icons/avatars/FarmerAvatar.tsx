import { AvatarBadge, type AvatarIllustrationProps } from './AvatarBadge'

/** Default Farmer picture: a seedling in the soil, echoing SeedlingIcon. */
export function FarmerAvatar(props: AvatarIllustrationProps) {
  return (
    <AvatarBadge toneClassName="text-brand-forest" {...props}>
      <path d="M24 35V23" />
      <path d="M24 26c-5.5 0-9-3.5-9-9 5.5 0 9 3.5 9 9Z" />
      <path d="M24 22c0-5 3.5-8.5 8.5-8.5 0 5-3.5 8.5-8.5 8.5Z" />
      <path d="M15 35h18" />
    </AvatarBadge>
  )
}
