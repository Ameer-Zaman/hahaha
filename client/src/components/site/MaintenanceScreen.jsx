import { communityLinks, site } from '../../config/site'
import usePageTitle from '../../hooks/usePageTitle'
import BrandMark from '../ui/BrandMark'
import './site-status.css'

/** What visitors see while maintenance mode is on (Panel → Site settings). */
export default function MaintenanceScreen({ message }) {
  usePageTitle('Back soon')
  const discord = communityLinks.find((link) => link.id === 'discord' && link.url)
  return (
    <main className="maint" aria-labelledby="maint-title">
      <div className="maint__card">
        <p className="maint__brand">
          <BrandMark className="maint__mark" />
          {site.name}
        </p>
        <p className="maint__kicker">
          <span className="maint__dot" aria-hidden="true" />
          Maintenance
        </p>
        <h1 id="maint-title" className="maint__title">
          We’ll be right back
        </h1>
        <p className="maint__message">{message || 'The website is getting some work done. Please check back soon.'}</p>
        {discord && (
          <a className="btn btn--primary btn--large" href={discord.url} target="_blank" rel="noopener noreferrer">
            Updates on Discord
          </a>
        )}
      </div>
    </main>
  )
}

/** A small notice for panel accounts, who still see the site while maintenance is on. */
export function MaintenancePreviewNotice() {
  return (
    <p className="maint-notice" role="status">
      <span className="maint__dot" aria-hidden="true" />
      Maintenance is on: visitors see the “be right back” screen.
      <a href="/panel/site">Turn it off</a>
    </p>
  )
}
