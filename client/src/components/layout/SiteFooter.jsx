import { Link } from 'react-router-dom'

import { site } from '../../config/site'
import { useCommunityLinks, useSiteSettings } from '../../lib/siteSettings'
import { BrandIcon } from '../ui/BrandIcons'
import { SOCIAL_PLATFORMS } from '../ui/socialPlatforms'
import BrandMark from '../ui/BrandMark'
import './footer.css'

const YEAR = new Date().getFullYear()

/** A compact footer: the name, the community links, and the small print. */
export default function SiteFooter() {
  // community links from the panel (or config/site.js until it has saved some), with their real logos
  const { logo } = useSiteSettings() // with a logo uploaded, the picture alone is the brand
  const socials = useCommunityLinks().map((link) => ({ ...link, platform: SOCIAL_PLATFORMS.find((p) => p.id === link.id) }))

  return (
    <footer className="site-footer theme-black">
      <div className="container site-footer__row">
        <Link to="/" className={`site-footer__name ${logo ? 'has-logo' : ''}`}>
          <BrandMark className="site-footer__mark" />
          <span className={logo ? 'visually-hidden' : undefined}>{site.name}</span>
        </Link>

        {socials.length > 0 && (
          <div className="site-footer__end">
            <ul role="list" className="site-footer__socials">
              {socials.map((link, i) => (
                <li key={`${link.id}-${i}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer__social"
                    style={link.platform ? { '--brand': link.platform.color } : undefined}
                    aria-label={`${site.name} on ${link.label} (opens in a new tab)`}
                    title={link.label}
                  >
                    {link.platform ? <BrandIcon platform={link.platform} size={20} /> : link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="container site-footer__base">
        <p>
          © {YEAR} {site.name}
        </p>
      </div>
    </footer>
  )
}
