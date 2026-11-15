import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/lib/useUiStore'
import { MOTION_PREFERENCES, type MotionPreference } from '@/lib/motionLevel'
import { ChipGroup } from './ChipGroup'

/** The Animations setting: Automatic (follow the device), Full, Lite or Off. */
export function MotionToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const motionPreference = useUiStore((state) => state.motionPreference)
  const setMotionPreference = useUiStore((state) => state.setMotionPreference)

  const options = MOTION_PREFERENCES.map((value) => ({
    value,
    label: t(`motion.${value}`),
  }))

  return (
    <ChipGroup<MotionPreference>
      label={t('motion.label')}
      options={options}
      value={motionPreference}
      onChange={setMotionPreference}
      size="sm"
      className={className}
    />
  )
}
