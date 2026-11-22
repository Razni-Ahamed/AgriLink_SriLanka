import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as smsAlertsApi from '../api/smsAlertsApi'

const smsAlertsKey = ['account', 'smsAlerts'] as const

export function useSmsAlertSettings() {
  return useQuery({ queryKey: smsAlertsKey, queryFn: smsAlertsApi.getSmsAlertSettings })
}

export function useUpdateSmsAlertSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: smsAlertsApi.updateSmsAlertSettings,
    onSuccess: (settings) => queryClient.setQueryData(smsAlertsKey, settings),
  })
}
