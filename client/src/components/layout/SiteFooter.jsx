import { Link } from 'react-router-dom'

import { applyLink, communityLinks, navigationLinks as navigation, site } from '../../config/site'
import Arrow from '../ui/Arrow'
import BrandMark from '../ui/BrandMark'
import './footer.css'
import ApplyLink from '../ui/ApplyLink'

const YEAR = new Date().getFullYear()

export default function SiteFooter() {
  const links = communityLinks.filter((link) => link.url)

  return (
    <footer className="site-footer theme-black">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <p className="site-footer__name">
            <BrandMark className="site-footer__mark" />
            {site.name}
          </p>
          <p className="site-footer__desc">{site.description}</p>
          <ApplyLink className="btn btn--primary">
            {applyLink.label} <Arrow />
          </ApplyLink>
        </div>

        <nav className="site-footer__col" aria-label="Footer">
          <h2 className="site-footer__heading">Explore</h2>
          <ul role="list">
            {navigation.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
            <li>
              <ApplyLink>{applyLink.label}</ApplyLink>
            </li>
          </ul>
        </nav>

        <div className="site-footer__col">
          <h2 className="site-footer__heading">Community</h2>
          {links.length > 0 ? (
            <ul role="list">
              {links.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="site-footer__muted">Official links will be published here.</p>
          )}
        </div>
      </div>

      <div className="container site-footer__base">
        <p>
          © {YEAR} {site.name}. All rights reserved.
        </p>
        <p className="site-footer__legal">
          Not affiliated with Rockstar Games, Take-Two Interactive or Cfx.re.
        </p>
        <p className="site-footer__status">
          {site.launch.isLive ? 'The city is open' : 'Launching soon — apply now'}
        </p>
      </div>
    </footer>
  )
}
