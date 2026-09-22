import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { UserProfileResponse } from '@/auth/api'
import { cn } from '@/lib/utils'
import { GeneralSettingsTab } from './GeneralSettingsTab'
import { SecuritySettingsTab } from './SecuritySettingsTab'

export type ProfileTab = 'general' | 'security'

const TABS: ProfileTab[] = ['general', 'security']

interface ProfileDialogProps {
  open: boolean
  tab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
  onClose: () => void
  /** Null while the profile is still loading. */
  user: UserProfileResponse | null
}

/**
 * The profile pop-up: General and Security tabs in a dialog that fills the screen on phones.
 * The tabs follow the WAI-ARIA tabs pattern with automatic activation — arrow keys, Home and End
 * move between them and show the matching panel. Part B replaces the Security tab's contents.
 */
export function ProfileDialog({ open, tab, onTabChange, onClose, user }: ProfileDialogProps) {
  const { t } = useTranslation('auth')
  const idPrefix = useId()
  const tabRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({ general: null, security: null })

  const tabId = (value: ProfileTab) => `${idPrefix}-tab-${value}`
  const panelId = (value: ProfileTab) => `${idPrefix}-panel-${value}`

  function select(next: ProfileTab) {
    onTabChange(next)
    tabRefs.current[next]?.focus()
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.indexOf(tab)
    const target = {
      ArrowRight: TABS[(index + 1) % TABS.length],
      ArrowLeft: TABS[(index - 1 + TABS.length) % TABS.length],
      Home: TABS[0],
      End: TABS[TABS.length - 1],
    }[event.key]
    if (target) {
      event.preventDefault()
      select(target)
    }
  }

  let panel: ReactNode
  if (!user) {
    panel = (
      <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
        <Spinner size="sm" />
        {t('profile.loading')}
      </div>
    )
  } else if (tab === 'general') {
    panel = <GeneralSettingsTab user={user} />
  } else {
    panel = <SecuritySettingsTab />
  }

  return (
    <Modal open={open} onClose={onClose} title={t('profile.title')} size="lg" fullScreenOnMobile>
      <div
        role="tablist"
        aria-label={t('profile.tabsLabel')}
        className="mb-5 flex gap-1 border-b border-brand-forest/10"
      >
        {TABS.map((value) => {
          const selected = value === tab
          return (
            <button
              key={value}
              ref={(element) => {
                tabRefs.current[value] = element
              }}
              id={tabId(value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(value)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-forest',
                selected
                  ? 'border-brand-forest text-brand-forest'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {t(value === 'general' ? 'profile.tabs.general' : 'profile.tabs.security')}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={0} className="outline-none">
        {panel}
      </div>
    </Modal>
  )
}
