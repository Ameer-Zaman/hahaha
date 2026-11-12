/** 25 → "$25", 24.5 → "$24.50", 0 → "Free", null → "Price on request" */
export function formatPrice(value, currency = 'USD') {
  if (value === null || value === undefined) return 'Price on request'
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
