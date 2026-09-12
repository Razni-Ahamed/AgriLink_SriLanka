import { useQuery } from '@tanstack/react-query'
import { getCropTypes } from './cropTypesApi'
import { cropCatalogOrder } from './cropCatalog'

/**
 * The crop types the API accepts, in catalogue display order. The server owns the list (it
 * rejects anything outside it), so the picker is always offering exactly what will validate.
 */
export function useCropTypes() {
  return useQuery({
    queryKey: ['cropTypes'] as const,
    queryFn: getCropTypes,
    staleTime: Infinity, // The catalogue ships with the backend; it cannot change at runtime.
    select: (cropTypes) => [...cropTypes].sort((a, b) => cropCatalogOrder(a) - cropCatalogOrder(b)),
  })
}
