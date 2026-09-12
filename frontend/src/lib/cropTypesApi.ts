import { apiClient } from './apiClient'

/** The canonical crop catalogue. Public, like /api/districts — the marketplace filter needs it
 *  before a visitor has signed in. */
export async function getCropTypes(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/crop-types')
  return data
}
