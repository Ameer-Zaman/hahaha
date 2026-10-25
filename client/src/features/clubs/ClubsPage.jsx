import { Link } from 'react-router-dom'

import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import usePageTitle from '../../hooks/usePageTitle'

/** Placeholder until the Clubs design is in: an honest "coming soon" in the site's style. */
export default function ClubsPage() {
  usePageTitle('Clubs')
  return (
    <ParallaxScope
      as="section"
      className="page-head page-head--word theme-dark"
      aria-labelledby="clubs-title"
      style={{ minHeight: '88svh' }}
    >
      <ParallaxWord text="Clubs" motion="x:6%:-10%" className="page-head__word" />
      <div className="container">
        <h1 id="clubs-title" className="page-head__title">
          Clubs
        </h1>
        <p className="lede">The clubs of the city are being set up. This page opens soon.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', marginTop: 'var(--sp-7)' }}>
          <Link to="/gangs" className="btn btn--primary btn--large">
            See the gangs <Arrow />
          </Link>
        </div>
      </div>
    </ParallaxScope>
  )
}
