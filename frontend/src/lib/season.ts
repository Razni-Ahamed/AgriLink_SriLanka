const DAY_MS = 24 * 60 * 60 * 1000

export interface SeasonProgress {
  /** Days since planting, counting the planting day as day 1. */
  day: number
  /** Days from planting to the expected harvest. */
  total: number
  /** 0–1, how far along the season is (capped at 1). */
  fraction: number
  /** Days until the expected harvest; negative once it has passed. */
  daysLeft: number
}

/** How far a crop is through its season, from its planting and expected harvest dates. */
export function seasonProgress(
  plantingDate: string,
  expectedHarvestDate: string,
  now: Date = new Date(),
): SeasonProgress {
  const start = startOfDay(new Date(plantingDate))
  const end = startOfDay(new Date(expectedHarvestDate))
  const today = startOfDay(now)

  const total = Math.max(1, Math.round((end - start) / DAY_MS))
  const elapsed = Math.round((today - start) / DAY_MS)
  const day = Math.min(Math.max(elapsed + 1, 0), total)
  const fraction = Math.min(Math.max(elapsed / total, 0), 1)
  const daysLeft = Math.round((end - today) / DAY_MS)

  return { day, total, fraction, daysLeft }
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}
