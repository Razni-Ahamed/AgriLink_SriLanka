import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as harvestsApi from '../api/harvestsApi'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'

const harvestsKey = (filters: HarvestFilters = {}) => ['harvests', filters] as const
const harvestKey = (harvestId: number) => ['harvests', 'detail', harvestId] as const

export function useHarvests(filters: HarvestFilters = {}) {
  return useQuery({
    queryKey: harvestsKey(filters),
    queryFn: () => harvestsApi.getHarvests(filters),
  })
}

export function useHarvest(harvestId: number) {
  return useQuery({
    queryKey: harvestKey(harvestId),
    queryFn: () => harvestsApi.getHarvest(harvestId),
    enabled: Number.isFinite(harvestId),
  })
}

export function useCreateHarvest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateHarvestListingRequest) => harvestsApi.createHarvest(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['harvests'] }),
  })
}

export function useUpdateHarvest(harvestId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateHarvestListingRequest) =>
      harvestsApi.updateHarvest(harvestId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['harvests'] }),
  })
}
