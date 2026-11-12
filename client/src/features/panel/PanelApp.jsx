import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { site } from '../../config/site'
import { USE_API } from '../../lib/api'
import { AuthProvider } from './auth'
import { canOpen } from './access'
import { useAuth } from './authContext'
import { Account, Accounts, AuditLog } from './screens/Accounts'
import { AnnouncementEditor, AnnouncementList } from './screens/Announcements'
import Backup from './screens/Backup'
import TwoFactor from './screens/TwoFactor'
import Dashboard from './screens/Dashboard'
import { GangEditor, GangList } from './screens/Gangs'
import { ClubEditor, ClubList } from './screens/Clubs'
import { EventEditor, EventList } from './screens/Events'
import Chat from './screens/Chat'
import Live from './screens/Live'
import Login from './screens/Login'
import { MediaLibrary, SiteMedia, StoryMedia } from './screens/MediaScreens'
import Rules from './screens/Rules'
import SiteSettings from './screens/SiteSettings'
import Staff from './screens/Staff'
import Creators from './screens/Creators'
import { ProductEditor, StoreList } from './screens/Store'
import Tdm from './screens/Tdm'
import Wars from './screens/Wars'
import { ErrorNote, Loading, ToastProvider } from './ui'
import './panel.css'

const NAV = [
  { group: null, items: [{ to: '/panel', label: 'Overview', end: true }] },
  {
    group: 'Website',
    items: [
      { to: '/panel/site', area: 'site', label: 'Sections & maintenance' },
      { to: '/panel/live', area: 'live', label: 'Live now' },
      { to: '/panel/announcements', area: 'announcements', label: 'Announcements' },
      { to: '/panel/chat', area: 'chat', label: 'Rules help chat' },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/panel/gangs', area: 'gangs', label: 'Gangs & players' },
      { to: '/panel/wars', area: 'wars', label: 'Wars' },
      { to: '/panel/clubs', area: 'clubs', label: 'Clubs' },
      { to: '/panel/events', area: 'events', label: 'Events' },
      { to: '/panel/tdm', area: 'tdm', label: 'TDM leaderboard' },
      { to: '/panel/staff', area: 'staff', label: 'Staff' },
      { to: '/panel/creators', area: 'creators', label: 'Creators' },
      { to: '/panel/store', area: 'store', label: 'Store' },
      { to: '/panel/rules', area: 'rules', label: 'Rules' },
    ],
  },
  {
    group: 'Media',
    items: [
      { to: '/panel/media', area: 'media', label: 'Media library' },
      { to: '/panel/site-media', area: 'homeMedia', label: 'Homepage media' },
      { to: '/panel/story-media', area: 'storyMedia', label: 'Story media' },
    ],
  },
  {
    group: 'Super Admin',
    superOnly: true,
    items: [
      { to: '/panel/accounts', label: 'Accounts' },
      { to: '/panel/backup', label: 'Backup' },
      { to: '/panel/audit', label: 'Audit log' },
    ],
  },
]

/** The admin panel at /panel. Lives outside the public layout; never indexed by search engines. */
export default function PanelApp() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = `Panel — ${site.name}`
    document.documentElement.classList.add('is-panel')
    return () => {
      meta.remove()
      document.title = title
      document.documentElement.classList.remove('is-panel')
    }
  }, [])

  // A site built without the API (VITE_USE_API=false) has no server to sign in to.
  if (!USE_API) return <NotConnected reason="off" />

  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  )
}

function Gate() {
  const auth = useAuth()
  if (auth.status === 'checking') {
    return (
      <main className="p-center">
        <Loading label={auth.waking ? 'Waking the server — this can take up to a minute…' : 'Checking your session…'} />
      </main>
    )
  }
  if (auth.status === 'down') {
    return (
      <main className="p-center">
        <ErrorNote message={`The panel can't reach the server right now. ${auth.error ?? ''}`} onRetry={() => window.location.reload()} />
      </main>
    )
  }
  if (auth.status === 'unconnected') return <NotConnected reason="missing" />
  if (auth.status === 'out') return <Login />
  // A Super Admin has made two-step sign-in compulsory and this account hasn't set it up:
  // the server refuses everything else anyway, so there is nothing else to show.
  if (auth.mustSetUpTwoFactor) return <TwoFactorRequired />
  return <Shell />
}

/** Nothing else can be done until two-step sign-in is set up. */
function TwoFactorRequired() {
  const { user, signOut } = useAuth()
  return (
    <main className="p-center p-center--wide">
      <div className="p-gate">
        <p className="p-brand">
          {site.name}
          <span>Panel</span>
        </p>
        <h1 className="p-gate__title">One more step</h1>
        <p className="p-gate__sub">
          Signed in as {user.email}. Two-step sign-in is required for every account here, so set it up to carry on.
        </p>
        <TwoFactor />
        <button type="button" className="pbtn" onClick={signOut}>
          Sign out instead
        </button>
      </div>
    </main>
  )
}

/** Shown when the website runs without its server: the panel needs the API to sign in. */
function NotConnected({ reason }) {
  return (
    <main className="p-login">
      <div className="p-login__card">
        <p className="p-brand">
          {site.name}
          <span>Panel</span>
        </p>
        <h1 className="p-login__title">Server not connected</h1>
        <p className="p-login__sub">
          The admin panel signs in through the website's API server, and this website isn't connected to one
          {reason === 'off' ? ' (it was built with VITE_USE_API=false).' : ' yet.'}
        </p>
        <ol className="p-steps">
          <li>
            Deploy the <code>server/</code> folder (Render web service) with a MongoDB Atlas database.
          </li>
          <li>
            Forward this website's <code>/api/*</code> to that server, and remove <code>VITE_USE_API=false</code>.
          </li>
          <li>
            Redeploy the website, then come back to <code>/panel</code>.
          </li>
        </ol>
        <p className="p-login__sub">The public website works without it, using its built-in content.</p>
        <a className="pbtn pbtn--ghost pbtn--block" href="/">
          Back to the website
        </a>
      </div>
    </main>
  )
}

function Shell() {
  const { user, isSuper, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="p-shell">
      <header className="p-topbar">
        <p className="p-brand">
          {site.name}
          <span>Panel</span>
        </p>
        <button
          type="button"
          className="pbtn pbtn--ghost pbtn--sm"
          aria-expanded={menuOpen}
          aria-controls="panel-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      {/* Picking any link closes the phone menu. */}
      <aside id="panel-nav" className={`p-side ${menuOpen ? 'is-open' : ''}`} onClick={(e) => e.target.closest('a') && setMenuOpen(false)}>
        <p className="p-brand p-side__brand">
          {site.name}
          <span>Panel</span>
        </p>
        <nav aria-label="Panel">
          {NAV.filter((g) => !g.superOnly || isSuper)
            .map((g) => ({ ...g, items: g.items.filter((item) => !item.area || canOpen(user, item.area)) }))
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.group ?? 'main'} className="p-nav__group">
                {g.group && <p className="p-nav__heading">{g.group}</p>}
                <ul role="list">
                  {g.items.map((item) => (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end} className="p-nav__link">
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </nav>
        <div className="p-side__foot">
          <NavLink to="/panel/account" className="p-side__user">
            <span className="p-side__name">{user.name}</span>
            <span className="p-side__role">{isSuper ? 'Super Admin' : 'Admin'} · Account</span>
          </NavLink>
          <a className="p-nav__link" href="/" target="_blank" rel="noreferrer">
            View website ↗
          </a>
          <button type="button" className="p-nav__link p-nav__signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="p-main" id="panel-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route
            path="gangs"
            element={
              <Area name="gangs">
                <GangList />
              </Area>
            }
          />
          <Route
            path="gangs/:id"
            element={
              <Area name="gangs">
                <GangEditor />
              </Area>
            }
          />
          <Route
            path="wars"
            element={
              <Area name="wars">
                <Wars />
              </Area>
            }
          />
          <Route
            path="clubs"
            element={
              <Area name="clubs">
                <ClubList />
              </Area>
            }
          />
          <Route
            path="clubs/:id"
            element={
              <Area name="clubs">
                <ClubEditor />
              </Area>
            }
          />
          <Route
            path="events"
            element={
              <Area name="events">
                <EventList />
              </Area>
            }
          />
          <Route
            path="events/:id"
            element={
              <Area name="events">
                <EventEditor />
              </Area>
            }
          />
          <Route
            path="tdm"
            element={
              <Area name="tdm">
                <Tdm />
              </Area>
            }
          />
          <Route
            path="staff"
            element={
              <Area name="staff">
                <Staff />
              </Area>
            }
          />
          <Route
            path="creators"
            element={
              <Area name="creators">
                <Creators />
              </Area>
            }
          />
          <Route
            path="store"
            element={
              <Area name="store">
                <StoreList />
              </Area>
            }
          />
          <Route
            path="store/:id"
            element={
              <Area name="store">
                <ProductEditor />
              </Area>
            }
          />
          <Route
            path="rules"
            element={
              <Area name="rules">
                <Rules />
              </Area>
            }
          />
          <Route
            path="media"
            element={
              <Area name="media">
                <MediaLibrary />
              </Area>
            }
          />
          <Route
            path="site-media"
            element={
              <Area name="homeMedia">
                <SiteMedia />
              </Area>
            }
          />
          <Route
            path="story-media"
            element={
              <Area name="storyMedia">
                <StoryMedia />
              </Area>
            }
          />
          <Route
            path="site"
            element={
              <Area name="site">
                <SiteSettings />
              </Area>
            }
          />
          <Route
            path="announcements"
            element={
              <Area name="announcements">
                <AnnouncementList />
              </Area>
            }
          />
          <Route
            path="announcements/:id"
            element={
              <Area name="announcements">
                <AnnouncementEditor />
              </Area>
            }
          />
          <Route
            path="chat"
            element={
              <Area name="chat">
                <Chat />
              </Area>
            }
          />
          <Route
            path="live"
            element={
              <Area name="live">
                <Live />
              </Area>
            }
          />
          <Route path="account" element={<Account />} />
          {isSuper && <Route path="accounts" element={<Accounts />} />}
          {isSuper && <Route path="backup" element={<Backup />} />}
          {isSuper && <Route path="audit" element={<AuditLog />} />}
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>
    </div>
  )
}

/** A page the account may not open: say so plainly (the server refuses its data anyway). */
function Area({ name, children }) {
  const { user } = useAuth()
  if (canOpen(user, name)) return children
  return (
    <div className="p-closed">
      <h1 className="p-closed__title">Not open for your account</h1>
      <p className="p-text">A Super Admin decides which parts of the panel each Admin can use. Ask one if you need this page.</p>
    </div>
  )
}
