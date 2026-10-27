import { Link } from 'react-router-dom'

import { applyLink, communityLinks, site } from '../../config/site'
import { useNavigation } from '../../lib/siteSettings'
import ApplyLink from '../ui/ApplyLink'
import { BrandIcon } from '../ui/BrandIcons'
import { SOCIAL_PLATFORMS } from '../ui/socialPlatforms'
import BrandMark from '../ui/BrandMark'
import './footer.css'

const YEAR = new Date().getFullYear()

/** A compact footer: the name, the page links in one row, community links + Apply, and the small print. */
export default function SiteFooter() {
  // community links with a URL, shown with their real logos (set them in config/site.js)
  const socials = communityLinks
    .filter((link) => link.url)
    .map((link) => ({ ...link, platform: SOCIAL_PLATFORMS.find((p) => p.id === link.id) }))
  const { links: navigation } = useNavigation()

  return (
    <footer className="site-footer theme-black">
      <div className="container site-footer__row">
        <Link to="/" className="site-footer__name">
          <BrandMark className="site-footer__mark" />
          {site.name}
        </Link>

        <nav className="site-footer__nav" aria-label="Footer">
          <ul role="list">
            {navigation.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer__end">
          {socials.length > 0 && (
            <ul role="list" className="site-footer__socials">
              {socials.map((link) => (
                <li key={link.id}>
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
          )}
          <ApplyLink className="btn btn--primary btn--small site-footer__apply">{applyLink.label}</ApplyLink>
        </div>
      </div>

      <div className="container site-footer__base">
        <p>
          © {YEAR} {site.name}
        </p>
        <p>Not affiliated with Rockstar Games, Take-Two Interactive or Cfx.re.</p>
        <p className="site-footer__status">{site.launch.isLive ? 'The city is open' : 'Launching soon'}</p>
      </div>
    </footer>
  )
}
