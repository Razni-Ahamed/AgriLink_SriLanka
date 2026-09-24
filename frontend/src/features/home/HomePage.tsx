import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight, Storefront, UserPlus } from '@phosphor-icons/react'
import { Basket, CheckCircle, ClipboardText, Farm, Plant } from '@/components/ui/icons'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Skeleton } from '@/components/ui/Skeleton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { HarvestCard } from '@/features/marketplace/components/HarvestCard'
import { useHarvests } from '@/features/marketplace/hooks/useHarvests'
import { cn } from '@/lib/utils'

const PREVIEW_COUNT = 6

/** The hero's decorative crop mosaic: a spread of the island's staple and export crops. */
const HERO_CROPS = [
  { crop: 'Paddy', tone: 'bg-brand-forest/10 text-brand-forest' },
  { crop: 'Tea', tone: 'bg-brand-harvest/15 text-brand-harvest' },
  { crop: 'Coconut', tone: 'bg-brand-terracotta/15 text-brand-terracotta' },
  { crop: 'Chilli', tone: 'bg-brand-terracotta/15 text-brand-terracotta' },
  { crop: 'Banana', tone: 'bg-brand-forest/10 text-brand-forest' },
  { crop: 'Cinnamon', tone: 'bg-brand-harvest/15 text-brand-harvest' },
  { crop: 'Mango', tone: 'bg-brand-harvest/15 text-brand-harvest' },
  { crop: 'Tomato', tone: 'bg-brand-terracotta/15 text-brand-terracotta' },
  { crop: 'Cabbage', tone: 'bg-brand-forest/10 text-brand-forest' },
]

/**
 * The public landing page at `/` for visitors who aren't signed in. It stands outside AppLayout
 * (like the login page) because it has its own header, with sign-in links instead of the app's
 * role navigation.
 */
export function HomePage() {
  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary">
      <HomeHeader />
      <main>
        <Hero />
        <RolesSection />
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
    <header className="sticky top-0 z-40 border-b border-brand-forest/10 bg-bg-surface/80 backdrop-blur-md">
      {/* Same two-row trick as AppLayout: on phones the language and theme controls drop below,
          or the sign-in buttons get pushed off the screen. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link to="/" className="mr-auto font-display text-xl text-brand-forest">
          {t('common:appName')}
        </Link>

        <div className="order-last flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto sm:justify-end sm:gap-4">
          <LanguageSwitcher variant="compact" />
          <ThemeToggle variant="compact" />
        </div>

        <nav className="flex items-center gap-2">
          <Link to="/login" className={buttonClasses('ghost', 'sm')}>
            {t('home:nav.login')}
          </Link>
          <Link to="/register" className={buttonClasses('primary', 'sm')}>
            {t('home:nav.register')}
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const { t } = useTranslation('home')

  return (
    <Section band="hero" className="grid items-center gap-10 pt-12 md:grid-cols-2 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-terracotta">
          {t('hero.eyebrow')}
        </p>
        <h1 className="font-display text-4xl leading-tight text-brand-forest sm:text-5xl">
          {t('hero.title')}
        </h1>
        <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">
          {t('hero.subtitle')}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className={buttonClasses('primary', 'lg')}>
            <UserPlus size={20} weight="duotone" />
            {t('hero.register')}
          </Link>
          <Link to="/marketplace/browse" className={buttonClasses('secondary', 'lg')}>
            <Storefront size={20} weight="duotone" />
            {t('hero.browse')}
          </Link>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        className="hidden grid-cols-3 gap-3 md:grid"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {HERO_CROPS.map(({ crop, tone }, index) => (
          <div
            key={crop}
            className={cn(
              'flex aspect-square items-center justify-center rounded-3xl border border-brand-forest/10',
              tone,
              // A staggered middle column keeps the grid from reading as a spreadsheet.
              index % 3 === 1 && 'translate-y-6',
            )}
          >
            <CropIcon cropType={crop} size={56} />
          </div>
        ))}
      </motion.div>
    </Section>
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
          icon={<ClipboardText size={22} weight="duotone" />}
          tone="terracotta"
          title={t('roles.officer.title')}
          description={t('roles.officer.description')}
          // Officers can't self-register — an admin creates their accounts — so no sign-up button.
          footer={<p className="text-sm italic text-text-secondary">{t('roles.officer.note')}</p>}
        />
        <RoleCard
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
  icon: ReactNode
  tone: 'forest' | 'harvest' | 'terracotta'
  title: string
  description: string
  footer: ReactNode
}

function RoleCard({ icon, tone, title, description, footer }: RoleCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <IconBadge tone={tone} className="h-11 w-11">
        {icon}
      </IconBadge>
      <div className="flex-1">
        <h3 className="mb-2 font-display text-xl text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {footer}
    </Card>
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

function StepsSection() {
  const { t } = useTranslation('home')

  return (
    <Section>
      <h2 className="mb-8 text-center font-display text-3xl text-text-primary">
        {t('steps.title')}
      </h2>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ key, icon }, index) => (
          <li key={key}>
            <Card className="h-full">
              <div className="mb-3 flex items-center gap-3">
                <IconBadge tone="forest">{icon}</IconBadge>
                <span className="font-mono text-sm tabular-nums text-text-secondary">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mb-1 font-display text-lg text-text-primary">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="text-sm text-text-secondary">{t(`steps.${key}.description`)}</p>
            </Card>
          </li>
        ))}
      </ol>
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
