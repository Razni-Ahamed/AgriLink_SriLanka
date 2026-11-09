import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as harvestsApi from '../api/harvestsApi'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'
import type { QuantityUnit } from '@/lib/units'

const harvestsKey = (filters: HarvestFilters = {}) => ['harvests', filters] as const
const harvestKey = (harvestId: number) => ['harvests', 'detail', harvestId] as const
const myHarvestsKey = ['harvests', 'mine'] as const
const priceGuideKey = (cropType: string, district: string | undefined, unit: QuantityUnit) =>
  ['harvests', 'price-guide', cropType, district ?? '', unit] as const

export function useHarvests(filters: HarvestFilters = {}) {
  return useQuery({
    queryKey: harvestsKey(filters),
    queryFn: () => harvestsApi.getHarvests(filters),
  })
}

/** The logged-in farmer's own listings, every status included — for the "My Listings" page. */
/** Off until a crop is chosen. Under ['harvests'], so publishing a listing refreshes it too. */
export function usePriceGuide(cropType?: string, district?: string, unit: QuantityUnit = 'Kg') {
  return useQuery({
    queryKey: priceGuideKey(cropType ?? '', district, unit),
    queryFn: () => harvestsApi.getPriceGuide(cropType!, district, unit),
    enabled: Boolean(cropType),
    staleTime: 5 * 60 * 1000,
  })
}

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
