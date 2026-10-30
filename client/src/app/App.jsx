import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from '../components/layout/Layout'
import { applyLink } from '../config/site'
import SectionClosed from '../components/site/SectionClosed'
import { PageLoader } from '../components/ui/Skeleton'
import { useLoadingSignal } from '../lib/loading'
import { useSectionOn } from '../lib/siteSettings'

// Every page is its own chunk, the homepage included: a visitor arriving on any other page
// never downloads the homepage's animation code. The loading screen covers the extra hop.
const HomePage = lazy(() => import('../features/home/HomePage'))
const StaffPage = lazy(() => import('../features/staff/StaffPage'))
const GangsPage = lazy(() => import('../features/gangs/GangsPage'))
const GangPage = lazy(() => import('../features/gangs/GangPage'))
const RulesPage = lazy(() => import('../features/rules/RulesPage'))
const ClubsPage = lazy(() => import('../features/clubs/ClubsPage'))
const DhadhasPage = lazy(() => import('../features/dhadhas/DhadhasPage'))
const StoryPage = lazy(() => import('../features/story/StoryPage'))
const LeaderboardPage = lazy(() => import('../features/leaderboard/LeaderboardPage'))
const NotFoundPage = lazy(() => import('../features/notfound/NotFoundPage'))
// The admin panel is its own chunk: visitors never download it.
const PanelApp = lazy(() => import('../features/panel/PanelApp'))

export default function App() {
  return (
    <Routes>
      <Route path="panel/*" element={<Lazy><PanelApp /></Lazy>} />
      <Route element={<Layout />}>
        <Route index element={<Lazy><HomePage /></Lazy>} />
        <Route path="staff" element={<Section to="/staff"><StaffPage /></Section>} />
        {/* the page used to be called Admin */}
        <Route path="admin" element={<Navigate to="/staff" replace />} />
        <Route path="gangs" element={<Section to="/gangs"><GangsPage /></Section>} />
        <Route path="gangs/:slug" element={<Section to="/gangs"><GangPage /></Section>} />
        <Route path="clubs" element={<Section to="/clubs"><ClubsPage /></Section>} />
        <Route path="dhadhas" element={<Section to="/dhadhas"><DhadhasPage /></Section>} />
        <Route path="story" element={<Section to="/story"><StoryPage /></Section>} />
        <Route path="leaderboard" element={<Section to="/leaderboard"><LeaderboardPage /></Section>} />
        <Route path="rules" element={<Section to="/rules"><RulesPage /></Section>} />
        {/* old /apply links: straight on to the Discord invite (or home if it isn't set yet) */}
        <Route path="apply" element={<ApplyRedirect />} />
        <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
      </Route>
    </Routes>
  )
}

function Lazy({ children }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

/**
 * While a page's code downloads: the gold line runs, and the diamond appears if it takes a
 * moment. It fills the viewport so the footer stays below the fold and never jumps when the
 * real page arrives.
 */
function RouteLoading() {
  useLoadingSignal(true)
  return (
    <div className="route-loading">
      <PageLoader label="Loading page" />
    </div>
  )
}

/** A page that can be switched off in the panel (Site settings → Sections). */
function Section({ to, children }) {
  return useSectionOn(to) ? <Lazy>{children}</Lazy> : <SectionClosed />
}

function ApplyRedirect() {
  if (applyLink.href) {
    window.location.replace(applyLink.href)
    return null
  }
  return <Navigate to="/" replace />
}
