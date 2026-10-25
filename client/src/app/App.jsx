import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from '../components/layout/Layout'
import HomePage from '../features/home/HomePage'
import { applyLink } from '../config/site'
import SectionClosed from '../components/site/SectionClosed'
import { useSectionOn } from '../lib/siteSettings'

// Inner pages are split into their own chunks so the homepage loads only what it needs.
const AdminPage = lazy(() => import('../features/admin/AdminPage'))
const GangsPage = lazy(() => import('../features/gangs/GangsPage'))
const GangPage = lazy(() => import('../features/gangs/GangPage'))
const RulesPage = lazy(() => import('../features/rules/RulesPage'))
const ClubsPage = lazy(() => import('../features/clubs/ClubsPage'))
const StoryPage = lazy(() => import('../features/story/StoryPage'))
const NotFoundPage = lazy(() => import('../features/notfound/NotFoundPage'))
// The admin panel is its own chunk: visitors never download it.
const PanelApp = lazy(() => import('../features/panel/PanelApp'))

export default function App() {
  return (
    <Routes>
      <Route path="panel/*" element={<Lazy><PanelApp /></Lazy>} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="admin" element={<Section to="/admin"><AdminPage /></Section>} />
        <Route path="gangs" element={<Section to="/gangs"><GangsPage /></Section>} />
        <Route path="gangs/:slug" element={<Section to="/gangs"><GangPage /></Section>} />
        <Route path="clubs" element={<Section to="/clubs"><ClubsPage /></Section>} />
        <Route path="story" element={<Section to="/story"><StoryPage /></Section>} />
        <Route path="rules" element={<Section to="/rules"><RulesPage /></Section>} />
        {/* old /apply links: straight on to the Discord invite (or home if it isn't set yet) */}
        <Route path="apply" element={<ApplyRedirect />} />
        <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
      </Route>
    </Routes>
  )
}

function Lazy({ children }) {
  return <Suspense fallback={<div className="route-loading" aria-busy="true" />}>{children}</Suspense>
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
