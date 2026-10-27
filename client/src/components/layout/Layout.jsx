import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import ScrollProgress from './ScrollProgress'
import TopProgress from '../ui/TopProgress'
import FluidCursor from '../cursor/FluidCursor'
import ChatWidget from '../chat/ChatWidget'
import { ScrollTrigger } from '../../lib/gsap'
import { setIntroActive, shouldShowIntro } from '../../lib/intro'
import WelcomeGate from '../intro/WelcomeGate'
import LoadingScreen from '../intro/LoadingScreen'
import MaintenanceScreen, { MaintenancePreviewNotice } from '../site/MaintenanceScreen'
import { useSiteSettings, useStaffPreview } from '../../lib/siteSettings'
import { preloadHomeAssets, preloadHomeInBackground } from '../../lib/preload'

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
    // start downloading before the page renders, so the videos never start a second download
    if (show) preloadHomeAssets()
    return show
  })
  // the loading screen shows first while the homepage downloads, then hands over to the gate
  const [showLoader, setShowLoader] = useState(showGate)
  const [loaderLeaving, setLoaderLeaving] = useState(false)

  // Landed on another page? Get the homepage's videos ready in the background, so going
  // there later is instant. (On the homepage the loading screen does this.)
  useEffect(() => {
    if (!showLoader) preloadHomeInBackground()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <TopProgress />
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
      <FluidCursor />
      <ChatWidget />
      {showGate && <WelcomeGate paused={showLoader && !loaderLeaving} onDone={() => setShowGate(false)} />}
      {showLoader && <LoadingScreen onLeave={() => setLoaderLeaving(true)} onDone={() => setShowLoader(false)} />}
    </>
  )
}
