import { AvatarBadge, type AvatarIllustrationProps } from './AvatarBadge'

/** Default Buyer picture: a market basket, echoing MarketBasketIcon. */
export function BuyerAvatar(props: AvatarIllustrationProps) {
  return (
    <AvatarBadge toneClassName="text-brand-terracotta" {...props}>
      <path d="M13.5 22h21l-2.4 11.3a2 2 0 0 1-2 1.7H17.9a2 2 0 0 1-2-1.7Z" />
      <path d="M18 22a6 6 0 0 1 12 0" />
      <path d="M19.5 26v5M24 26v5M28.5 26v5" />
    </AvatarBadge>
  )
}
