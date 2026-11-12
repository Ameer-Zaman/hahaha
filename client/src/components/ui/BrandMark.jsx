import { useSiteSettings } from '../../lib/siteSettings'

/**
 * The community's mark: the logo uploaded in Panel → Site settings → Site logo, or, until one
 * is set, a plain gold diamond placeholder.
 */
export default function BrandMark({ className = '' }) {
  const { logo } = useSiteSettings()
  if (logo) return <img className={`brand-mark brand-mark--img ${className}`} src={logo} alt="" decoding="async" />
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="12" width="8" height="8" transform="rotate(45 16 16)" fill="currentColor" />
    </svg>
  )
}
