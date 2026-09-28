import { cn } from '@/lib/utils'

// Shared by the header's small buttons (language, theme, log out). Collapsed, a compact square; on
// hover or keyboard focus it turns to liquid glass, like the current navigation tab, and widens to
// show its full name.
export const headerButtonClass = cn(
  'glass-hover group relative flex h-10 min-w-10 items-center justify-center overflow-hidden rounded-xl px-2.5',
  'border border-brand-forest/15 bg-bg-canvas text-brand-forest',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest',
)

// The same 0fr → 1fr grid slide as the navigation tabs' names.
export const slide =
  'grid transition-[grid-template-columns,opacity,margin] duration-300 ease-out motion-reduce:transition-none'
export const opensOnHover =
  'grid-cols-[0fr] opacity-0 group-hover:grid-cols-[1fr] group-hover:opacity-100 group-focus-visible:grid-cols-[1fr] group-focus-visible:opacity-100'
