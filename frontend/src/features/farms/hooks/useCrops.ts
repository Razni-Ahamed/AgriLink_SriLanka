import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as cropsApi from '../api/cropsApi'
import type { CreateCropRequest, CropDto, UpdateCropRequest } from '@/types/dto/crops'

const cropKey = (cropId: number) => ['crops', cropId] as const

/**
 * There is no `GET` endpoint that lists crops for a field (only
 * `POST /api/fields/{fieldId}/crops` and `GET/PUT /api/crops/{cropId}`).
 * We track crops planted this session in the query cache so FieldDetailPage
 * can link to them; the list does not survive a page refresh. A real
 * `GET /api/farms/{farmId}/fields/{fieldId}/crops` endpoint is needed from
 * the backend — flagged to the team, see PR description.
 */
const fieldCropsKey = (fieldId: number) => ['fields', fieldId, 'crops'] as const

export function useCrop(cropId: number) {
  return useQuery({
    queryKey: cropKey(cropId),
    queryFn: () => cropsApi.getCrop(cropId),
    enabled: Number.isFinite(cropId),
  })
}

export function usePlantCrop(fieldId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCropRequest) => cropsApi.plantCrop(fieldId, request),
    onSuccess: (crop) => {
      queryClient.setQueryData<CropDto[]>(fieldCropsKey(fieldId), (existing) => [
        ...(existing ?? []),
        crop,
      ])
    },
  })
}

export function useFieldCrops(fieldId: number) {
  return useQuery({
    queryKey: fieldCropsKey(fieldId),
    queryFn: () => Promise.resolve<CropDto[]>([]),
    initialData: [] as CropDto[],
    staleTime: Infinity,
  })
}

export function useUpdateCropStatus(cropId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateCropRequest) => cropsApi.updateCrop(cropId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cropKey(cropId) }),
  })
}
