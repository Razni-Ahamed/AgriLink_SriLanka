import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { scenes, type Scene } from '@/lib/scenes'
import { cn } from '@/lib/utils'

interface PhotoBannerProps {
  /** Which photo sits underneath: a named scene, or any image URL (a crop photo). */
  photo: Scene | (string & {})
  title: ReactNode
  /** One line under the title. */
  subtitle?: ReactNode
  /** Small line above the title (a date, a place). */
  eyebrow?: ReactNode
  /** Buttons on the right (or under the title on phones). */
  actions?: ReactNode
  /** A glass strip along the bottom of the banner: stats, search, filters. */
  children?: ReactNode
  /** Which part of the photo stays in frame when cropped (CSS object-position). */
  focus?: string
  /** A round glass back button above the title (detail pages). */
  back?: { to: string; label: string }
  /** `compact` for working pages (lists, queues), so the content starts higher. */
  size?: 'hero' | 'compact'
  className?: string
}

/**
 * The top of a page: a real photo with the page's title over it, and optionally a glass strip
 * (stats, search) floating on the photo. The text sits on a dark scrim, so it stays white and
 * readable whatever the photo and whatever the theme. The photo settles in with a slow zoom once
 * when the page opens.
 */
export function PhotoBanner({
  photo,
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  focus = 'center',
  size = 'hero',
  back,
  className,
}: PhotoBannerProps) {
  const compact = size === 'compact'
  const src = photo in scenes ? scenes[photo as Scene] : photo

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] bg-brand-ink shadow-lg',
        className,
      )}
    >
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover"
        style={{ objectPosition: focus }}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(4_16_11/0.86)_0%,rgb(4_16_11/0.6)_45%,rgb(4_16_11/0.18)_100%)]"
      />

      <div
        className={cn(
          'flex flex-col gap-4 px-5 text-white sm:flex-row sm:items-end sm:justify-between sm:px-8',
          compact ? 'pt-6 pb-5 sm:pt-8' : 'pt-7 pb-6 sm:pt-10',
        )}
      >
        <div className="min-w-0 max-w-2xl">
          {back && (
            <Link
              to={back.to}
              aria-label={back.label}
              title={back.label}
              className="banner-glass mb-4 flex size-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white"
            >
              <ArrowLeft size={18} weight="bold" />
            </Link>
          )}
          {eyebrow && <p className="mb-2 text-sm text-white/75">{eyebrow}</p>}
          <h1
            className={cn(
              'font-display leading-[1.05] font-bold text-balance',
              compact ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-5xl',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className={cn('mt-2 max-w-xl text-white/80', !compact && 'sm:text-lg')}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>

      {children && <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>}
    </section>
  )
}

/**
 * The glass strip that floats on a banner's photo. Always the dark glass, since it sits on a
 * dark photo in both themes.
 */
export function BannerGlass({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('banner-glass rounded-[22px] text-white', className)}>{children}</div>
}
