import { Link } from 'react-router-dom'

import { useAuth } from '../authContext'
import { adminApi } from '../panelApi'
import { formatWhen } from '../format'
import { useResource } from '../hooks'
import { ErrorNote, Loading, PageHead, Panel } from '../ui'

export default function Dashboard() {
  const { user, isSuper } = useAuth()
  const { data, error, loading, reload } = useResource(() => adminApi.get('/overview'))

  return (
    <>
      <PageHead title={`Welcome, ${user.name.split(' ')[0]}`} sub="Everything you change here shows on the public website within a minute." />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          {(data.maintenance || data.sectionsOff?.length > 0) && (
            <Panel className={data.maintenance ? 'p-maint is-on' : ''}>
              <p className="p-text">
                {data.maintenance ? 'Maintenance mode is on: visitors see the “We’ll be right back” screen. ' : ''}
                {data.sectionsOff?.length > 0 ? `Switched off: ${data.sectionsOff.join(', ')}. ` : ''}
                <Link to="/panel/site" className="p-link">
                  Sections & maintenance
                </Link>
              </p>
            </Panel>
          )}
          <ul className="p-stats" role="list">
            <Stat to="/panel/gangs" label="Gangs" value={data.gangs} />
            <Stat to="/panel/gangs" label="Players listed" value={data.players} />
            <Stat to="/panel/wars" label="War records" value={data.wars} />
            <Stat to="/panel/clubs" label="Clubs" value={data.clubs ?? 0} />
            <Stat to="/panel/staff" label="Staff online" value={`${data.staffOnline} / ${data.staff}`} hint="Online out of all staff cards" />
          </ul>

          <div className="p-grid-2">
            <Panel title="Rule book">
              <p className="p-text">
                {data.rules.published
                  ? `Published ${formatWhen(data.rules.publishedAt)}.`
                  : 'Not published from the panel yet — the website shows its built-in draft.'}
              </p>
              <Link to="/panel/rules" className="pbtn pbtn--ghost pbtn--sm">
                Open the rule book
              </Link>
            </Panel>
            <Panel title="Quick start">
              <ol className="p-steps">
                <li>Upload photos and videos in <Link to="/panel/media">Media library</Link>.</li>
                <li>Add each gang, its players and emblem in <Link to="/panel/gangs">Gangs</Link>.</li>
                <li>Log fights between gangs in <Link to="/panel/wars">Wars</Link>.</li>
                <li>Add staff cards and flip their status in <Link to="/panel/staff">Staff</Link>.</li>
              </ol>
            </Panel>
          </div>

          {isSuper && (
            <Panel title="Recent activity" actions={<Link to="/panel/audit" className="p-link">Full audit log</Link>}>
              {data.recent.length === 0 ? (
                <p className="p-text">Nothing yet.</p>
              ) : (
                <ul className="p-activity" role="list">
                  {data.recent.map((e) => (
                    <li key={e.id}>
                      <span className="p-activity__what">
                        <code>{e.action}</code> {e.summary || e.target}
                      </span>
                      <span className="p-activity__who">
                        {e.actorEmail || 'system'} · {formatWhen(e.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}
    </>
  )
}

function Stat({ to, label, value, hint }) {
  return (
    <li>
      <Link to={to} className="p-stat" title={hint}>
        <span className="p-stat__value">{value}</span>
        <span className="p-stat__label">{label}</span>
      </Link>
    </li>
  )
}
