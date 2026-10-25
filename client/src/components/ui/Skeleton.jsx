import './loading.css'

/** A shimmering placeholder block. `w`/`h` accept any CSS length. */
export function Skeleton({ w = '100%', h = '1em', radius = 6, className = '', style }) {
  return <span className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: radius, ...style }} aria-hidden="true" />
}

/** Wraps placeholders so screen readers hear "loading" once, not every block. */
export function SkeletonGroup({ label = 'Loading', className = '', children }) {
  return (
    <div className={`skeleton-group ${className}`} role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  )
}

/** The branded loader for pages that take a moment: the diamond, softly pulsing. */
export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status" aria-busy="true" aria-label={label}>
      <span className="page-loader__mark" aria-hidden="true">
        <span />
      </span>
    </div>
  )
}
