/** 25 → "$25", 24.5 → "$24.50", 0 → "Free", no price yet → "Coming soon" */
export function formatPrice(value, currency = 'USD') {
  if (value === null || value === undefined) return 'Coming soon'
  if (value === 0) return 'Free'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/** No price yet = "Coming soon": it can be looked at, not bought. */
export const isSoon = (p) => p.price === null || p.price === undefined
