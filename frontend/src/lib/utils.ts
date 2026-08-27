export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function formatArea(area: number): string {
  return `${area.toLocaleString('en-LK', { maximumFractionDigits: 2 })} acres`
}

export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('en-LK', { maximumFractionDigits: 2 })
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
}
