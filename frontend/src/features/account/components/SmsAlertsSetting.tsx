import { useTranslation } from 'react-i18next'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/config'
import { useUiStore } from '@/lib/useUiStore'
import { useSmsAlertSettings, useUpdateSmsAlertSettings } from '../hooks/useSmsAlertSettings'

type OnOff = 'on' | 'off'

/**
 * Lets a user also get key alerts (a new purchase request, a confirmed order, an officer's reply)
 * by text message, in the language they choose. Hidden until the server has an SMS gateway.
 */
export function SmsAlertsSetting() {
  const { t } = useTranslation(['common'])
  const addToast = useUiStore((state) => state.addToast)
  const { data: settings } = useSmsAlertSettings()
  const update = useUpdateSmsAlertSettings()

  if (!settings?.available) {
    return null
  }

  function save(change: { enabled?: boolean; language?: Language }) {
    update.mutate(change, {
      onError: () => addToast({ type: 'error', message: t('common:smsAlerts.error') }),
    })
  }

  const canTurnOn = settings.phoneCanReceiveSms
  const onOffOptions = [
    { value: 'on' as const, label: t('common:smsAlerts.on') },
    { value: 'off' as const, label: t('common:smsAlerts.off') },
  ]
  const languageOptions = SUPPORTED_LANGUAGES.map((code) => ({
    value: code,
    label: t(`common:language.${code}`),
  }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-xs">
          <p className="text-sm font-medium text-text-primary">{t('common:smsAlerts.label')}</p>
          <p className="text-xs text-text-secondary">
            {canTurnOn
              ? t('common:smsAlerts.hint', { phone: settings.phoneNumber })
              : t('common:smsAlerts.needsMobile')}
          </p>
        </div>
        <ChipGroup<OnOff>
          label={t('common:smsAlerts.label')}
          options={
            canTurnOn || settings.enabled
              ? onOffOptions
              : onOffOptions.filter((o) => o.value === 'off')
          }
          value={settings.enabled ? 'on' : 'off'}
          onChange={(value) => save({ enabled: value === 'on' })}
          size="sm"
        />
      </div>
      {settings.enabled && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{t('common:smsAlerts.languageLabel')}</p>
          <ChipGroup<Language>
            label={t('common:smsAlerts.languageLabel')}
            options={languageOptions}
            value={settings.language}
            onChange={(language) => save({ language })}
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
