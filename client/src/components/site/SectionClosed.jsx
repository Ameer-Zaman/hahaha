import { Link } from 'react-router-dom'

import usePageTitle from '../../hooks/usePageTitle'
import Arrow from '../ui/Arrow'

/** Shown at the address of a section that is switched off in the panel. */
export default function SectionClosed() {
  usePageTitle('Closed for now')
  return (
    <section className="page-head theme-black" aria-labelledby="closed-title" style={{ minHeight: '80svh' }}>
      <div className="container">
        <h1 id="closed-title" className="page-head__title">
          Closed for now
        </h1>
        <p className="lede">This part of the website is closed at the moment. Check back soon.</p>
        <div style={{ marginTop: 'var(--sp-7)' }}>
          <Link to="/" className="btn btn--primary btn--large">
            Go to the homepage <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
