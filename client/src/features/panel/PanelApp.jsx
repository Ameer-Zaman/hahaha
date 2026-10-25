import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { site } from '../../config/site'
import { AuthProvider } from './auth'
import { useAuth } from './authContext'
import { Account, Accounts, AuditLog } from './screens/Accounts'
import Dashboard from './screens/Dashboard'
import { GangEditor, GangList } from './screens/Gangs'
import Login from './screens/Login'
import { MediaLibrary, SiteMedia } from './screens/Media'
import Rules from './screens/Rules'
import Staff from './screens/Staff'
import Wars from './screens/Wars'
import { ErrorNote, Loading, ToastProvider } from './ui'
import './panel.css'

const NAV = [
  { group: null, items: [{ to: '/panel', label: 'Overview', end: true }] },
  {
    group: 'Content',
    items: [
      { to: '/panel/gangs', label: 'Gangs & players' },
      { to: '/panel/wars', label: 'Wars' },
      { to: '/panel/staff', label: 'Staff' },
      { to: '/panel/rules', label: 'Rules' },
    ],
  },
  {
    group: 'Media',
    items: [
      { to: '/panel/media', label: 'Media library' },
      { to: '/panel/site-media', label: 'Homepage media' },
    ],
  },
  {
    group: 'Super Admin',
    superOnly: true,
    items: [
      { to: '/panel/accounts', label: 'Accounts' },
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
  if (auth.status === 'out') return <Login />
  return <Shell />
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
          {NAV.filter((g) => !g.superOnly || isSuper).map((g) => (
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
          <Route path="gangs" element={<GangList />} />
          <Route path="gangs/:id" element={<GangEditor />} />
          <Route path="wars" element={<Wars />} />
          <Route path="staff" element={<Staff />} />
          <Route path="rules" element={<Rules />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="site-media" element={<SiteMedia />} />
          <Route path="account" element={<Account />} />
          {isSuper && <Route path="accounts" element={<Accounts />} />}
          {isSuper && <Route path="audit" element={<AuditLog />} />}
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>
    </div>
  )
}
