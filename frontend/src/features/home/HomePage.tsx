import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Storefront, UserPlus } from '@phosphor-icons/react'
import { Basket, CheckCircle, ClipboardText, Farm, Plant } from '@/components/ui/icons'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { BrandMark } from '@/components/ui/BrandMark'
import { Skeleton } from '@/components/ui/Skeleton'
import { LanguageCycleButton, ThemeCycleButton } from '@/components/ui/PreferenceCycleButtons'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { HarvestCard } from '@/features/marketplace/components/HarvestCard'
import { useHarvests } from '@/features/marketplace/hooks/useHarvests'
import { GlassLens } from '@/components/canopy/GlassLens'
import { onPhotoButton } from '@/components/canopy/onPhoto'
import { Odometer } from '@/components/canopy/Odometer'
import { cropPhoto } from '@/lib/cropPhotos'
import { spring } from '@/lib/motion'
import { useUnits } from '@/lib/units'
import { useCropLabel } from '@/lib/useCropLabel'
import { cn } from '@/lib/utils'
import { PHOTOS, type HomePhoto } from './homePhotos'

const PREVIEW_COUNT = 6

/**
 * The public landing page at `/` for visitors who aren't signed in. It stands outside AppLayout
 * (like the login page) because it has its own header, with sign-in links instead of the app's
 * role navigation.
 */
export function HomePage() {
  return (
    <div className="min-h-screen text-text-primary">
      <HomeHeader />
      <main>
        <Hero />
        <RolesSection />
        <StorySection />
        <MarketplacePreview />
        <StepsSection />
      </main>
      <HomeFooter />
    </div>
  )
}

/**
 * Full-width background bands. The band spans the whole window so a wide screen doesn't look
 * empty at the sides, while the content inside stays capped at a readable width.
 */
const bandClasses = {
  plain: '',
  hero: 'bg-gradient-to-br from-brand-harvest/15 via-bg-canvas to-brand-forest/10',
  tint: 'border-y border-brand-forest/10 bg-brand-forest/5',
} as const

interface SectionProps {
  children: ReactNode
  band?: keyof typeof bandClasses
  /** Classes for the centred content column, not the band. */
  className?: string
}

function Section({ children, band = 'plain', className }: SectionProps) {
  return (
    <section className={bandClasses[band]}>
      <div className={cn('mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8', className)}>
        {children}
      </div>
    </section>
  )
}

function HomeHeader() {
  const { t } = useTranslation(['home', 'common'])

  return (
    <div className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
      {/* The same floating glass bar, logo and language and theme buttons as the signed-in
          header. On phones the logo shrinks to its leaf, so the two buttons and the sign-in
          links fit on one row. */}
      <header className="glass-bar mx-auto flex max-w-7xl items-center gap-2 rounded-[22px] px-3 py-2 sm:gap-3 sm:rounded-full sm:px-4">
        <Link to="/" aria-label={t('common:appName')} className="mr-auto shrink-0">
          <BrandMark nameClassName="max-sm:sr-only" />
        </Link>

        <LanguageCycleButton />
        <ThemeCycleButton />

        <nav className="flex items-center gap-2">
          <Link to="/login" className={buttonClasses('ghost', 'sm')}>
            {t('home:nav.login')}
          </Link>
          <Link to="/register" className={buttonClasses('primary', 'sm')}>
            {t('home:nav.register')}
          </Link>
        </nav>
      </header>
    </div>
  )
}

/**
 * The opening: terraced paddy from above, full width, with a glass lens drifting over it (follow
 * it with the pointer: it shows the fields closer and clearer, the way glass bends light). The
 * promise and the two ways in sit on the left; on the right a glass board of real asking prices
 * from active listings, whose digits roll up as it appears.
 */
function Hero() {
  const { t } = useTranslation('home')

  return (
    <section className="px-2 pt-3 sm:px-4">
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-brand-ink shadow-lg">
        <img
          src={PHOTOS.paddyAerial.src}
          srcSet={PHOTOS.paddyAerial.srcSet}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgb(4_16_11/0.88)_0%,rgb(4_16_11/0.72)_34%,rgb(4_16_11/0.2)_75%),linear-gradient(0deg,rgb(4_16_11/0.55)_0%,transparent_30%)]"
        />
        <GlassLens src={PHOTOS.paddyAerial.src} naturalWidth={640} naturalHeight={360} />

        <div className="relative z-[2] grid items-center gap-10 px-5 py-12 text-white sm:px-10 md:grid-cols-[1.1fr_0.9fr] md:py-20 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.reveal, delay: 0.05 }}
          >
            <p className="mb-4 text-sm font-medium text-[#efc062]">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-5xl leading-[0.98] font-extrabold text-balance sm:text-6xl lg:text-7xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{t('hero.subtitle')}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClasses('primary', 'lg')}>
                <UserPlus size={20} weight="duotone" />
                {t('hero.register')}
              </Link>
              <Link
                to="/marketplace/browse"
                className={cn(buttonClasses('secondary', 'lg'), onPhotoButton)}
              >
                <Storefront size={20} weight="duotone" />
                {t('hero.browse')}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.reveal, delay: 0.2 }}
          >
            <PriceBoard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Real asking prices from the newest active listings, on dark glass over the hero photo. */
function PriceBoard() {
  const { t } = useTranslation(['home', 'common'])
  const cropLabel = useCropLabel()
  const units = useUnits()
  const { data: harvests, isLoading } = useHarvests({ sort: 'newest' })
  const rows = (harvests ?? []).filter((harvest) => harvest.status === 'Active').slice(0, 5)

  return (
    <div className="banner-glass rounded-[26px] p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h2 className="font-display text-2xl font-bold">{t('board.title')}</h2>
        <span className="flex items-center gap-1.5 text-xs text-white/70">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#d3e77a] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#d3e77a]" />
          </span>
          {t('board.note')}
        </span>
      </div>

      {isLoading && <div className="h-56 animate-pulse rounded-2xl bg-white/5" />}

      {!isLoading && rows.length === 0 && (
        <p className="px-1 py-6 text-sm text-white/75">{t('board.empty')}</p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-white/10">
          {rows.map((harvest, index) => (
            <motion.li
              key={harvest.harvestId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.move, delay: 0.35 + index * 0.07 }}
            >
              <Link
                to={`/marketplace/${harvest.harvestId}`}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-white/[0.06]"
              >
                <img
                  src={cropPhoto(harvest.cropType)}
                  alt=""
                  aria-hidden="true"
                  className="size-11 rounded-xl object-cover"
                />
                <span className="min-w-0">
                  <b className="block truncate font-semibold">{cropLabel(harvest.cropType)}</b>
                  <span className="block truncate text-xs text-white/65">{harvest.district}</span>
                </span>
                <span className="text-right">
                  <span className="font-display text-xl font-bold">
                    Rs <Odometer value={harvest.pricePerUnit} rollIn />
                  </span>
                  <span className="block text-xs text-white/65">/{units.per(harvest.unit)}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Link
        to="/marketplace/browse"
        className="mt-2 flex items-center justify-end gap-1 px-1 text-sm text-white/80 hover:text-white"
      >
        {t('board.see')}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  )
}

interface PhotoFrameProps {
  photo: HomePhoto
  caption: string
  /** Tells the browser how wide the photo shows, so it picks the 640 or the 1280px file. */
  sizes: string
  loading?: 'eager' | 'lazy'
  priority?: boolean
  /** Hide the caption (the alt text still describes the photo). */
  captionHidden?: boolean
  className?: string
}

/**
 * A photo filling its frame, with its caption over a dark fade along the bottom, which keeps the
 * white text readable on any photo in either theme. The caption is hidden from screen readers
 * because the alt text already says the same.
 */
function PhotoFrame({
  photo,
  caption,
  sizes,
  loading = 'lazy',
  priority = false,
  captionHidden = false,
  className,
}: PhotoFrameProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden border border-brand-forest/10 bg-brand-forest/10',
        className,
      )}
    >
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={caption}
        loading={loading}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        style={photo.focus ? { objectPosition: photo.focus } : undefined}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
      />
      {!captionHidden && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/65 to-transparent px-3 pt-8 pb-2.5 text-xs font-medium text-white sm:block"
        >
          {caption}
        </p>
      )}
    </div>
  )
}

function RolesSection() {
  const { t } = useTranslation('home')

  return (
    <Section>
      <h2 className="mb-8 text-center font-display text-3xl text-text-primary">
        {t('roles.title')}
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        <RoleCard
          photo={PHOTOS.farmerGarden}
          icon={<Farm size={22} weight="duotone" />}
          tone="forest"
          title={t('roles.farmer.title')}
          description={t('roles.farmer.description')}
          footer={
            <Link to="/register?role=Farmer" className={buttonClasses('primary', 'md', 'w-full')}>
              {t('roles.farmer.cta')}
            </Link>
          }
        />
        <RoleCard
          photo={PHOTOS.walkingFields}
          icon={<ClipboardText size={22} weight="duotone" />}
          tone="terracotta"
          title={t('roles.officer.title')}
          description={t('roles.officer.description')}
          // Officers can't self-register — an admin creates their accounts — so no sign-up button.
          footer={<p className="text-sm italic text-text-secondary">{t('roles.officer.note')}</p>}
        />
        <RoleCard
          photo={PHOTOS.vegetableStall}
          icon={<Basket size={22} weight="duotone" />}
          tone="harvest"
          title={t('roles.buyer.title')}
          description={t('roles.buyer.description')}
          footer={
            <Link to="/register?role=Buyer" className={buttonClasses('secondary', 'md', 'w-full')}>
              {t('roles.buyer.cta')}
            </Link>
          }
        />
      </div>
    </Section>
  )
}

interface RoleCardProps {
  photo: HomePhoto
  icon: ReactNode
  tone: 'forest' | 'harvest' | 'terracotta'
  title: string
  description: string
  footer: ReactNode
}

function RoleCard({ photo, icon, tone, title, description, footer }: RoleCardProps) {
  const { t } = useTranslation('home')
  return (
    <Card className="flex flex-col gap-4 overflow-hidden">
      {/* Bleeds to the card's edges (past its padding), with the icon sitting on its lower edge.
          The icon is `relative z-10`: the photo's frame is positioned, so it would otherwise be
          painted over the icon. */}
      <PhotoFrame
        photo={photo}
        caption={t(`photos.${photo.key}`)}
        sizes="(min-width: 768px) 30vw, 100vw"
        captionHidden
        className="-mx-5 -mt-5 aspect-[16/9] border-0 border-b"
      />
      {/* The badge's tint is see-through, so it sits on a solid card-coloured backing. */}
      <span className="relative z-10 -mt-10 w-fit rounded-xl bg-bg-surface ring-4 ring-bg-surface">
        <IconBadge tone={tone} className="h-11 w-11">
          {icon}
        </IconBadge>
      </span>
      <div className="flex-1">
        <h3 className="mb-2 font-display text-xl text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {footer}
    </Card>
  )
}

const STORY = [
  { key: 'report', photo: PHOTOS.tendingCrop },
  { key: 'advice', photo: PHOTOS.examiningLeaves },
  { key: 'sell', photo: PHOTOS.marketHandover },
] as const

/**
 * "A season with AgriLink": three steps down the left, and on wide screens one large photo held
 * in view on the right that crossfades to match whichever step is in the middle of the window.
 * On narrower screens each step simply shows its own photo above it.
 */
function StorySection() {
  const { t } = useTranslation('home')
  const [active, setActive] = useState(0)
  const stepRefs = useRef<Array<HTMLLIElement | null>>([])

  useEffect(() => {
    // A step counts as current while it crosses the middle tenth of the window.
    if (typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.step))
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const step of stepRefs.current) {
      if (step) {
        observer.observe(step)
      }
    }
    return () => observer.disconnect()
  }, [])

  return (
    <Section band="tint">
      <div className="mx-auto mb-4 max-w-2xl text-center">
        <p className="mb-2 text-sm font-medium text-brand-terracotta">{t('story.eyebrow')}</p>
        <h2 className="font-display text-3xl text-text-primary sm:text-4xl">{t('story.title')}</h2>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        <ol>
          {STORY.map(({ key, photo }, index) => (
            <li
              key={key}
              ref={(element) => {
                stepRefs.current[index] = element
              }}
              data-step={index}
              className="flex flex-col justify-center gap-5 py-8 lg:min-h-[70vh]"
            >
              <PhotoFrame
                photo={photo}
                caption={t(`photos.${photo.key}`)}
                sizes="100vw"
                className="aspect-[4/3] rounded-3xl lg:hidden"
              />
              <div
                className={cn(
                  'transition-opacity duration-500 motion-reduce:transition-none',
                  index === active ? 'lg:opacity-100' : 'lg:opacity-40',
                )}
              >
                <span className="tabular-nums text-sm text-brand-terracotta">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 mb-2 font-display text-2xl text-text-primary sm:text-3xl">
                  {t(`story.${key}.title`)}
                </h3>
                <p className="max-w-md text-base text-text-secondary">
                  {t(`story.${key}.description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="hidden lg:block">
          {/* Held just below the sticky site header while the steps scroll past. */}
          <div className="sticky top-24 h-[70vh] overflow-hidden rounded-3xl">
            {STORY.map(({ key, photo }, index) => (
              <div
                key={key}
                aria-hidden={index !== active}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none',
                  index === active ? 'opacity-100' : 'opacity-0',
                )}
              >
                <PhotoFrame
                  photo={photo}
                  caption={t(`photos.${photo.key}`)}
                  sizes="45vw"
                  className="h-full rounded-3xl"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

function MarketplacePreview() {
  const { t } = useTranslation('home')
  // GET /api/harvests is public and returns Active listings newest first.
  const { data: harvests, isLoading, isError } = useHarvests()
  const preview = harvests?.slice(0, PREVIEW_COUNT)

  return (
    <Section band="tint">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-text-primary">{t('marketplace.title')}</h2>
          <p className="text-sm text-text-secondary">{t('marketplace.subtitle')}</p>
        </div>
        <Link to="/marketplace/browse" className={buttonClasses('ghost', 'md')}>
          {t('marketplace.viewAll')}
          <ArrowRight size={16} />
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PREVIEW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-text-secondary">{t('marketplace.error')}</p>}

      {preview && preview.length === 0 && (
        <p className="text-sm text-text-secondary">{t('marketplace.empty')}</p>
      )}

      {preview && preview.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((harvest) => (
            <StaggerList.Item key={harvest.harvestId}>
              <HarvestCard harvest={harvest} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </Section>
  )
}

const STEPS = [
  { key: 'register', icon: <UserPlus size={22} weight="duotone" /> },
  { key: 'approval', icon: <CheckCircle size={22} weight="duotone" /> },
  { key: 'setUp', icon: <Plant size={22} weight="duotone" /> },
  { key: 'connect', icon: <Storefront size={22} weight="duotone" /> },
] as const

/**
 * "How it works" as a timeline: four steps joined by a line (across the page on wide screens, down
 * it on narrow ones), each fading in as it scrolls into view, then a sign-up button. It's the last
 * section before the footer, so the natural place to ask people to join.
 */
function StepsSection() {
  const { t } = useTranslation('home')
  const reduceMotion = useReducedMotion()

  return (
    <Section>
      <h2 className="mb-10 text-center font-display text-3xl text-text-primary">
        {t('steps.title')}
      </h2>

      <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
        {/* Wide screens: one line across the page through the circles' centres, from the first
            to the last. Below `lg` each step draws its own join down to the next (the `after:`
            line on the li), so the line stops at the last circle. */}
        <span
          aria-hidden="true"
          className="absolute top-7 right-[12.5%] left-[12.5%] hidden h-0.5 -translate-y-1/2 bg-brand-forest/20 lg:block"
        />
        {STEPS.map(({ key, icon }, index) => (
          <motion.li
            key={key}
            className="relative flex gap-5 after:absolute after:top-14 after:-bottom-8 after:left-7 after:w-0.5 after:-translate-x-1/2 after:bg-brand-forest/20 last:after:hidden lg:flex-col lg:items-center lg:gap-4 lg:text-center lg:after:hidden"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.45, delay: index * 0.12, ease: 'easeOut' }}
          >
            {/* A solid backing, so the line doesn't show through the circle. */}
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-brand-forest/30 bg-bg-canvas text-brand-forest shadow-sm [&_svg]:size-6">
              {icon}
            </span>
            <div className="pt-1 lg:pt-0">
              <span className="tabular-nums text-xs text-brand-terracotta">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-0.5 mb-1 font-display text-lg text-text-primary">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="max-w-xs text-sm text-text-secondary lg:mx-auto">
                {t(`steps.${key}.description`)}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>

      <motion.div
        className="mx-auto mt-14 flex max-w-xl flex-col items-center rounded-3xl border border-brand-forest/10 bg-brand-forest/5 px-6 py-8 text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <h3 className="font-display text-2xl text-text-primary">{t('steps.ctaTitle')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('steps.ctaSubtitle')}</p>
        <Link to="/register" className={buttonClasses('primary', 'lg', 'mt-5')}>
          <UserPlus size={20} weight="duotone" />
          {t('hero.register')}
        </Link>
        <p className="mt-4 text-sm text-text-secondary">
          {t('steps.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-brand-forest hover:underline">
            {t('nav.login')}
          </Link>
        </p>
      </motion.div>
    </Section>
  )
}

function HomeFooter() {
  const { t } = useTranslation(['home', 'common'])
  const linkClass = 'text-sm text-text-secondary hover:text-brand-forest hover:underline'

  return (
    <footer className="border-t border-brand-forest/10 bg-bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-xl text-brand-forest">{t('common:appName')}</p>
          <p className="mt-2 text-sm text-text-secondary">{t('home:footer.tagline')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-primary">{t('home:footer.explore')}</p>
          <Link to="/marketplace/browse" className={linkClass}>
            {t('home:hero.browse')}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-primary">{t('home:footer.account')}</p>
          <Link to="/login" className={linkClass}>
            {t('home:nav.login')}
          </Link>
          <Link to="/register" className={linkClass}>
            {t('home:nav.register')}
          </Link>
          <Link to="/admin/login" className={linkClass}>
            {t('home:footer.adminLogin')}
          </Link>
        </div>
      </div>

      <p className="border-t border-brand-forest/10 py-4 text-center text-xs text-text-secondary">
        {t('home:footer.rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  )
}
