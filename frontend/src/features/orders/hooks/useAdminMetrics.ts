import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'
import type { CreateUserRequest } from '@/types/dto/admin'

const metricsKey = ['admin', 'metrics'] as const

export function useAdminMetrics() {
  return useQuery({ queryKey: metricsKey, queryFn: adminApi.getAdminMetrics })
}

export function usePhotoDiagnosisSummary() {
  return useQuery({ queryKey: ['admin', 'photo-diagnoses'] as const, queryFn: adminApi.getPhotoDiagnosisSummary })
}

export function useDownloadConfirmedPhotos() {
  return useMutation({ mutationFn: adminApi.downloadConfirmedPhotos })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateUserRequest) => adminApi.createUser(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: metricsKey }),
  })
}
