import { apiClient } from '@/lib/apiClient'
import type { Language } from '@/i18n/config'

/** Matches AgriLink.API.DTOs.Users.SmsAlertSettingsResponse. */
export interface SmsAlertSettings {
  /** False until the server has an SMS gateway set up. */
  available: boolean
  enabled: boolean
  language: Language
  phoneNumber?: string | null
  /** False for a missing number or a landline, which can't receive SMS. */
  phoneCanReceiveSms: boolean
}

export interface UpdateSmsAlertSettings {
  enabled?: boolean
  language?: Language
}

export async function getSmsAlertSettings(): Promise<SmsAlertSettings> {
  const { data } = await apiClient.get<SmsAlertSettings>('/api/users/me/sms-alerts')
  return data
}

export async function updateSmsAlertSettings(
  request: UpdateSmsAlertSettings,
): Promise<SmsAlertSettings> {
  const { data } = await apiClient.put<SmsAlertSettings>('/api/users/me/sms-alerts', request)
  return data
}
