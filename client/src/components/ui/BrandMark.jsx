/**
 * PLACEHOLDER mark — a plain gold diamond, not a logo. Replace this component's contents
 * with the community's official logo (SVG or <img>) once one is supplied.
 */
export default function BrandMark({ className = '' }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="12" width="8" height="8" transform="rotate(45 16 16)" fill="currentColor" />
    </svg>
  )
}
