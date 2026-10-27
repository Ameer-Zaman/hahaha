import { Link } from 'react-router-dom'

import { applyLink, communityLinks, site } from '../../config/site'
import { useNavigation } from '../../lib/siteSettings'
import ApplyLink from '../ui/ApplyLink'
import BrandMark from '../ui/BrandMark'
import './footer.css'

const YEAR = new Date().getFullYear()

/** A compact footer: the name, the page links in one row, community links + Apply, and the small print. */
export default function SiteFooter() {
  const links = communityLinks.filter((link) => link.url)
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
          {links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="site-footer__community">
              {link.label}
            </a>
          ))}
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
