import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as farmsApi from '../api/farmsApi'
import type { CreateFarmRequest, CreateFieldRequest, UpdateFarmRequest } from '@/types/dto/farms'

const farmsKey = ['farms'] as const
const fieldsKey = (farmId: number) => ['farms', farmId, 'fields'] as const

export function useFarms() {
  return useQuery({ queryKey: farmsKey, queryFn: farmsApi.getFarms })
}

export function useFarm(farmId: number) {
  const { data: farms, ...rest } = useFarms()
  return { ...rest, data: farms?.find((farm) => farm.farmId === farmId) }
}

export function useCreateFarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateFarmRequest) => farmsApi.createFarm(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmsKey }),
  })
}

export function useUpdateFarm(farmId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateFarmRequest) => farmsApi.updateFarm(farmId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmsKey }),
  })
}

export function useDeleteFarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (farmId: number) => farmsApi.deleteFarm(farmId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: farmsKey }),
  })
}

export function useFields(farmId: number) {
  return useQuery({
    queryKey: fieldsKey(farmId),
    queryFn: () => farmsApi.getFields(farmId),
    enabled: Number.isFinite(farmId),
  })
}

export function useField(farmId: number, fieldId: number) {
  const { data: fields, ...rest } = useFields(farmId)
  return { ...rest, data: fields?.find((field) => field.fieldId === fieldId) }
}

export function useCreateField(farmId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateFieldRequest) => farmsApi.createField(farmId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fieldsKey(farmId) }),
  })
}
