import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ProfileChangesTab } from '../components/ProfileChangesTab'
import { RegistrationsTab } from '../components/RegistrationsTab'

type ApprovalsTab = 'registrations' | 'profileChanges'

const TABS: ApprovalsTab[] = ['registrations', 'profileChanges']

/**
 * Everything an Officer or Admin needs to approve: new-account registrations, and (now) identity
 * detail change requests. The two queues follow the same WAI-ARIA tabs pattern as the profile
 * pop-up — automatic activation, arrow keys/Home/End move between them.
 */
export function PendingRegistrationsPage() {
  const { t } = useTranslation('registrations')
  const [tab, setTab] = useState<ApprovalsTab>('registrations')
  const idPrefix = useId()
  const tabRefs = useRef<Record<ApprovalsTab, HTMLButtonElement | null>>({
    registrations: null,
    profileChanges: null,
  })

  const tabId = (value: ApprovalsTab) => `${idPrefix}-tab-${value}`
  const panelId = (value: ApprovalsTab) => `${idPrefix}-panel-${value}`

  function select(next: ApprovalsTab) {
    setTab(next)
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('pending.pageTitle')}</h1>

      <div
        role="tablist"
        aria-label={t('pending.pageTitle')}
        className="flex gap-1 border-b border-brand-forest/10"
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
              onClick={() => setTab(value)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-forest',
                selected
                  ? 'border-brand-forest text-brand-forest'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {t(value === 'registrations' ? 'pending.tabs.registrations' : 'pending.tabs.profileChanges')}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={0} className="outline-none">
        {tab === 'registrations' ? <RegistrationsTab /> : <ProfileChangesTab />}
      </div>
    </div>
  )
}
