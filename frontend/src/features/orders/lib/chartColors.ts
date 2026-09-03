// Single source of truth for chart hex values, pulled from the "Organic Bento"
// design tokens (frontend/src/index.css). Recharts needs literal hex/rgb — it
// can't consume Tailwind's CSS custom properties directly — so this is the one
// place those tokens get duplicated as hex; every chart imports from here
// rather than hardcoding its own colors.
export const chartColors = {
  primary: '#4a7c59', // brand-forest-light — passes contrast on both light and dark surfaces
  accent: '#d9a441', // brand-harvest
  terracotta: '#c4623b', // brand-terracotta
  success: '#3e7a4f', // state-success
  danger: '#b84c3c', // state-danger
  info: '#3e7a82', // state-info
  textSecondary: '#6b6259', // text-secondary
  gridline: '#6b625933', // text-secondary at low opacity, for hairline gridlines
} as const
