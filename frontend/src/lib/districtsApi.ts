import { apiClient } from './apiClient'

/** Public — GET /api/districts has no [Authorize], since the register form needs it pre-login. */
export async function getDistricts(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/districts')
  return data
}
