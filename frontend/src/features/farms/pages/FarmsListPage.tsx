import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { PhotoBanner } from '@/components/canopy/PhotoBanner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/auth/authStore'
import { mutationErrorMessage } from '@/lib/apiErrors'
import { longDate, timeOfDay } from '@/lib/greeting'
import { spring } from '@/lib/motion'
import { CropSeasonCard } from '../components/CropSeasonCard'
import { FarmCard } from '../components/FarmCard'
import { FarmerOverview } from '../components/FarmerOverview'
import { WeatherCard } from '../components/WeatherCard'
import { FarmForm } from '../components/FarmForm'
import { useMyCrops } from '../hooks/useCrops'
import { useCreateFarm, useFarms } from '../hooks/useFarms'

/**
 * The farmer's home, "Today": a greeting over a morning photo with what needs them on glass, then
 * their growing crops (each its own photo, with the season growing along a vine), then their farms.
 */
export function FarmsListPage() {
  const { t, i18n } = useTranslation('farms')
  const user = useAuthStore((state) => state.user)
  const { data: farms, isLoading } = useFarms()
  const { data: crops, isLoading: cropsLoading } = useMyCrops()
  const createFarm = useCreateFarm()
  const [isModalOpen, setModalOpen] = useState(false)

  const name = (user?.displayName || user?.fullName || '').split(' ')[0]
  const growing = (crops ?? []).filter((crop) => crop.status !== 'Harvested')
  // The farmer's own district, or their first farm's.
  const district = user?.district || farms?.[0]?.district

  return (
    <div className="flex flex-col gap-8">
      <PhotoBanner
        photo="morning"
        focus="center 35%"
        eyebrow={longDate(i18n.language)}
        title={name ? t(`today.${timeOfDay()}`, { name }) : t('list.title')}
        subtitle={t('today.subtitle')}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('list.newFarm')}
          </Button>
        }
      >
        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <FarmerOverview />
          {district && <WeatherCard district={district} />}
        </div>
      </PhotoBanner>

      <Section title={t('today.crops')}>
        {cropsLoading && <CardSkeletons height="h-[230px]" />}
        {!cropsLoading && growing.length === 0 && <Empty>{t('today.cropsEmpty')}</Empty>}
        {growing.length > 0 && (
          <Grid>
            {growing.map((crop, index) => (
              <Rise key={crop.cropId} index={index}>
                <CropSeasonCard crop={crop} />
              </Rise>
            ))}
          </Grid>
        )}
      </Section>

      <Section title={t('today.farms')}>
        {isLoading && <CardSkeletons height="h-56" />}
        {!isLoading && farms && farms.length === 0 && <Empty>{t('list.empty')}</Empty>}
        {farms && farms.length > 0 && (
          <Grid>
            {farms.map((farm, index) => (
              <Rise key={farm.farmId} index={index}>
                <FarmCard farm={farm} />
              </Rise>
            ))}
          </Grid>
        )}
      </Section>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          createFarm.reset()
        }}
        title={t('list.newFarm')}
      >
        <FarmForm
          submitLabel={t('list.createFarm')}
          isSubmitting={createFarm.isPending}
          error={mutationErrorMessage(createFarm, t, 'farms:form.saveError')}
          onSubmit={(values) => createFarm.mutate(values, { onSuccess: () => setModalOpen(false) })}
        />
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

/** Cards rise into place one after another when the page opens. */
function Rise({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.reveal, delay: 0.1 + Math.min(index, 6) * 0.06 }}
    >
      {children}
    </motion.div>
  )
}

function CardSkeletons({ height }: { height: string }) {
  return (
    <Grid>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className={`${height} rounded-[28px]`} />
      ))}
    </Grid>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[22px] border border-dashed border-text-primary/15 p-6 text-sm text-text-secondary">
      {children}
    </p>
  )
}
