import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as cropsApi from '../api/cropsApi'
import type { CreateCropRequest, UpdateCropRequest } from '@/types/dto/crops'

const cropKey = (cropId: number) => ['crops', cropId] as const
const fieldCropsKey = (fieldId: number) => ['fields', fieldId, 'crops'] as const
const myCropsKey = ['crops', 'mine'] as const

export function useCrop(cropId: number) {
  return useQuery({
    queryKey: cropKey(cropId),
    queryFn: () => cropsApi.getCrop(cropId),
    enabled: Number.isFinite(cropId),
  })
}

/** The crops planted in one field, from GET /api/fields/{fieldId}/crops. */
export function useFieldCrops(fieldId: number) {
  return useQuery({
    queryKey: fieldCropsKey(fieldId),
    queryFn: () => cropsApi.getFieldCrops(fieldId),
    enabled: Number.isFinite(fieldId),
  })
}

/**
 * Every crop the logged-in farmer has planted, with farm/field context — for the crop pickers
 * on "Report an Issue" and "New Listing", which need to name a crop, not an id.
 */
export function useMyCrops() {
  return useQuery({
    queryKey: myCropsKey,
    queryFn: cropsApi.getMyCrops,
  })
}

export function usePlantCrop(fieldId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCropRequest) => cropsApi.plantCrop(fieldId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fieldCropsKey(fieldId) })
      void queryClient.invalidateQueries({ queryKey: myCropsKey })
    },
  })
}

export function useUpdateCropStatus(cropId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateCropRequest) => cropsApi.updateCrop(cropId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cropKey(cropId) })
      void queryClient.invalidateQueries({ queryKey: myCropsKey })
    },
  })
}
