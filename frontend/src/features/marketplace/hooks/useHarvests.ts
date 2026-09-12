import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as harvestsApi from '../api/harvestsApi'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'

const harvestsKey = (filters: HarvestFilters = {}) => ['harvests', filters] as const
const harvestKey = (harvestId: number) => ['harvests', 'detail', harvestId] as const
const myHarvestsKey = ['harvests', 'mine'] as const

export function useHarvests(filters: HarvestFilters = {}) {
  return useQuery({
    queryKey: harvestsKey(filters),
    queryFn: () => harvestsApi.getHarvests(filters),
  })
}

/** The logged-in farmer's own listings, every status included — for the "My Listings" page. */
export function useMyHarvests() {
  return useQuery({
    queryKey: myHarvestsKey,
    queryFn: harvestsApi.getMyHarvests,
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
