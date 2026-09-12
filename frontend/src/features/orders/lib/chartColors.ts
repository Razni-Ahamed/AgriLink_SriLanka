import { useUiStore } from '@/lib/useUiStore'
import type { ResolvedTheme } from '@/lib/themeStorage'

// Single source of truth for chart hex values, pulled from the "Organic Bento"
// design tokens (frontend/src/index.css). Recharts needs literal hex/rgb — it
// can't consume Tailwind's CSS custom properties directly — so this is the one
// place those tokens get duplicated as hex; every chart imports from here
// rather than hardcoding its own colors.
//
// Because they're literals, they can't follow the `.dark` class the way a
// utility class does: each theme needs its own set, kept in step with the
// matching block in index.css. Read them through useChartColors().
export interface ChartColors {
  primary: string
  accent: string
  terracotta: string
  success: string
  danger: string
  info: string
  textSecondary: string
  gridline: string
}

const lightChartColors: ChartColors = {
  primary: '#4a7c59', // brand-forest-light — passes contrast on the light canvas
  accent: '#d9a441', // brand-harvest
  terracotta: '#c4623b', // brand-terracotta
  success: '#3e7a4f', // state-success
  danger: '#b84c3c', // state-danger
  info: '#3e7a82', // state-info
  textSecondary: '#6b6259', // text-secondary
  gridline: '#6b625933', // text-secondary at low opacity, for hairline gridlines
}

const darkChartColors: ChartColors = {
  primary: '#7cbe8c', // brand-forest (dark) — luminous leaf, 8.6:1 on the dark canvas
  accent: '#e8bd60', // brand-harvest (dark)
  terracotta: '#dd7d55', // brand-terracotta (dark)
  success: '#74c489', // state-success (dark)
  danger: '#e8806c', // state-danger (dark)
  info: '#66b3bb', // state-info (dark)
  textSecondary: '#a49c8e', // text-secondary (dark)
  gridline: '#a49c8e2e', // text-secondary at low opacity — lighter alpha, since
  // a dark gridline would disappear into the canvas
}

export const chartColorsByTheme: Record<ResolvedTheme, ChartColors> = {
  light: lightChartColors,
  dark: darkChartColors,
}

/**
 * Chart colors for the theme currently on screen. Subscribes to the UI store,
 * so charts re-render with the new palette the moment the theme is toggled.
 */
export function useChartColors(): ChartColors {
  return chartColorsByTheme[useUiStore((state) => state.theme)]
}

/** @deprecated Use `useChartColors()` so charts follow the active theme. */
export const chartColors = lightChartColors
