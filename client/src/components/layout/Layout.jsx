import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import ScrollProgress from './ScrollProgress'
import { ScrollTrigger } from '../../lib/gsap'
import { setIntroActive, shouldShowIntro } from '../../lib/intro'
import WelcomeGate from '../intro/WelcomeGate'
import HelloScreen from '../intro/HelloScreen'
import MaintenanceScreen, { MaintenancePreviewNotice } from '../site/MaintenanceScreen'
import { useSiteSettings, useStaffPreview } from '../../lib/siteSettings'

/** Pages whose first screen is light (none: the site is black and gold throughout). */
const LIGHT_TOP = []

/** Full-screen pages with no footer (the Gangs reel loops endlessly instead of ending). */
const NO_FOOTER = ['/gangs']

export default function Layout() {
  const { pathname, hash } = useLocation()
  const tone = LIGHT_TOP.includes(pathname) ? 'light' : 'dark'

  // Decided once, on first load: the welcome screen only greets visitors landing on the homepage.
  const [showGate, setShowGate] = useState(() => {
    const show = shouldShowIntro(pathname)
    setIntroActive(show)
    return show
  })
  // the "hello" intro plays first (and downloads the homepage), then hands over to the gate
  const [showHello, setShowHello] = useState(showGate)

  // New page: start at the top (or at the anchor), and let ScrollTrigger re-measure.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [pathname, hash])

  // Maintenance mode (Panel → Site settings): visitors get the "be right back" screen;
  // signed-in panel accounts still see the site, with a notice.
  const { maintenance } = useSiteSettings({ watch: true })
  const preview = useStaffPreview(maintenance.on)
  if (maintenance.on && !preview.staff) {
    return preview.checked ? <MaintenanceScreen message={maintenance.message} /> : <div className="route-loading" aria-busy="true" />
  }

  return (
    <>
      {maintenance.on && <MaintenancePreviewNotice />}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!NO_FOOTER.includes(pathname) && <ScrollProgress />}
      <SiteHeader tone={tone} />
      <main id="main" tabIndex={-1}>
        {/* keyed by path so each page fades in once on arrival */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      {!NO_FOOTER.includes(pathname) && <SiteFooter />}
      {showGate && <WelcomeGate paused={showHello} onDone={() => setShowGate(false)} />}
      {showHello && <HelloScreen onDone={() => setShowHello(false)} />}
    </>
  )
}
