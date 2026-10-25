import { applyLink } from '../../config/site'

/**
 * Every "Apply" call to action. Applications happen on the community's Discord server,
 * so this opens the Discord invite in a new tab. Until the invite link is set in
 * src/config/site.js it renders as an inactive button that says the link is on its way,
 * rather than a link that goes nowhere.
 */
export default function ApplyLink({ className = '', children = applyLink.label, onClick }) {
  if (!applyLink.href) {
    return (
      <span className={`${className} is-pending`} role="link" aria-disabled="true" title="Discord invite coming soon">
        {children}
      </span>
    )
  }
  return (
    <a className={className} href={applyLink.href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {children}
      <span className="visually-hidden"> (opens Discord in a new tab)</span>
    </a>
  )
}
