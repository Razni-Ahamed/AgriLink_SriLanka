import { useQuery } from '@tanstack/react-query'
import { getDistricts } from './districtsApi'

export function useDistricts() {
  return useQuery({
    queryKey: ['districts'] as const,
    queryFn: getDistricts,
    staleTime: Infinity, // Sri Lanka's 25 administrative districts don't change at runtime.
  })
}
