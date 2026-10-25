import { Link } from 'react-router-dom'

import usePageTitle from '../../hooks/usePageTitle'
import Arrow from '../../components/ui/Arrow'
import ApplyLink from '../../components/ui/ApplyLink'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <section className="page-head theme-black" aria-labelledby="nf-title" style={{ minHeight: '80svh' }}>
      <div className="container">
        <h1 id="nf-title" className="page-head__title">
          This street doesn’t exist
        </h1>
        <p className="lede">The page you were looking for isn’t part of the city. Check the address, or head back.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', marginTop: 'var(--sp-7)' }}>
          <Link to="/" className="btn btn--primary btn--large">
            Go to the homepage <Arrow />
          </Link>
          <ApplyLink className="btn btn--ghost btn--large">
            Apply now
          </ApplyLink>
        </div>
      </div>
    </section>
  )
}
