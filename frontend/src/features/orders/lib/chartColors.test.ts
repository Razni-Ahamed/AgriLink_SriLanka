import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { chartColorsByTheme, useChartColors } from './chartColors'
import { useUiStore } from '@/lib/useUiStore'

type ColorKey = keyof typeof chartColorsByTheme.light

describe('chart palettes', () => {
  it('defines the same keys for both themes', () => {
    expect(Object.keys(chartColorsByTheme.dark).sort()).toEqual(
      Object.keys(chartColorsByTheme.light).sort(),
    )
  })

  it('gives every color its own dark value', () => {
    // Recharts takes literal hex, so none of these follow the `.dark` class on
    // their own — one left at its light value would silently stay wrong.
    const unchanged = (Object.keys(chartColorsByTheme.light) as ColorKey[]).filter(
      (key) => chartColorsByTheme.light[key] === chartColorsByTheme.dark[key],
    )
    expect(unchanged).toEqual([])
  })

  it('follows the theme on screen', () => {
    useUiStore.setState({ theme: 'dark' })
    const { result, rerender } = renderHook(() => useChartColors())
    expect(result.current).toBe(chartColorsByTheme.dark)

    useUiStore.setState({ theme: 'light' })
    rerender()
    expect(result.current).toBe(chartColorsByTheme.light)
  })
})
