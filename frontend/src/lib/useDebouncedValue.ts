import { useEffect, useState } from 'react'

/** `value`, but only once it has stopped changing for `delayMs` — e.g. a search box, so a query
 *  goes out when typing pauses rather than on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
