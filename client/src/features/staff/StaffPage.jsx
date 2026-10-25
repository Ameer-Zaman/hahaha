import { useMemo, useState } from 'react'

import usePageTitle from '../../hooks/usePageTitle'
import { staffSlots } from '../../content/staff'
import useStaffStatus from './useStaffStatus'
import './staff.css'
import Arrow from '../../components/ui/Arrow'
import { SocialLinks } from '../../components/ui/BrandIcons'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import ApplyLink from '../../components/ui/ApplyLink'

const STATUS_COPY = {
  'not-connected': {
    title: 'Live status is not published yet',
    body: 'Online and on-duty status appears here once the team starts posting it. Until then, no status is shown — anything else would be a guess.',
  },
  loading: { title: 'Checking who is online', body: 'Contacting the server.' },
  error: {
    title: 'Live status is unavailable right now',
    body: 'The status service did not answer. Staff are still listed below; their status will return when the connection does.',
  },
}

/** Cards without a department are listed under this heading. */
const NO_DEPARTMENT = 'Team'

/**
 * The Staffs page: every staff member, grouped by department (Management, PD, EMS …), with a
 * department filter, a "Live now" filter and each member's social links.
 */
export default function StaffPage() {
  usePageTitle('Staffs')
  const status = useStaffStatus()
  const { staff } = status
  const hasStatus = status.state === 'ok'
  const [department, setDepartment] = useState('all')
  const [liveOnly, setLiveOnly] = useState(false)

  const isLive = (member) => {
    const s = status.byId[String(member.id)]
    return Boolean(s && (s.online || s.onDuty))
  }

  // departments in the order their first member appears (the panel's "Order" field)
  const departments = useMemo(() => {
    const seen = new Map()
    for (const member of staff) {
      const name = member.department?.trim() || NO_DEPARTMENT
      seen.set(name, (seen.get(name) ?? 0) + 1)
    }
    return [...seen].map(([name, count]) => ({ name, count }))
  }, [staff])

  const liveCount = hasStatus ? staff.filter(isLive).length : 0
  const current = departments.some((d) => d.name === department) ? department : 'all'
  const showLive = liveOnly && hasStatus

  const groups = departments
    .filter((d) => current === 'all' || d.name === current)
    .map((d) => ({
      name: d.name,
      members: staff.filter((m) => (m.department?.trim() || NO_DEPARTMENT) === d.name && (!showLive || isLive(m))),
    }))
    .filter((g) => g.members.length > 0)

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="staff-title">
        <ParallaxWord text="Staff" motion="x:6%:-10%" className="page-head__word" />
        <div className="container staff-head">
          <div>
            <h1 id="staff-title" className="page-head__title">
              Staffs
            </h1>
            <p className="lede">Every department of the city in one place: who they are, what they do and who is online right now.</p>
          </div>
          {hasStatus ? (
            status.updatedAt && (
              <p className="staff-updated">
                Status updated{' '}
                <time dateTime={status.updatedAt}>
                  {new Date(status.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </p>
            )
          ) : (
            <div className="notice" role="status">
              <p className="notice__title">{STATUS_COPY[status.state].title}</p>
              <p className="notice__body">{STATUS_COPY[status.state].body}</p>
            </div>
          )}
        </div>
      </ParallaxScope>

      <section className="staff-dir theme-black section" aria-label="Staff directory">
        <div className="container">
          {staff.length > 0 ? (
            <>
              <div className="staff-filters" role="group" aria-label="Filter staff">
                <div className="staff-filters__chips" role="group" aria-label="Department">
                  <Chip active={current === 'all'} onClick={() => setDepartment('all')} label="All" count={staff.length} />
                  {departments.length > 1 &&
                    departments.map((d) => (
                      <Chip key={d.name} active={current === d.name} onClick={() => setDepartment(d.name)} label={d.name} count={d.count} />
                    ))}
                </div>
                <button
                  type="button"
                  className={`staff-live-toggle ${showLive ? 'is-on' : ''}`}
                  aria-pressed={showLive}
                  disabled={!hasStatus}
                  title={hasStatus ? undefined : 'Live status is not available yet'}
                  onClick={() => setLiveOnly((v) => !v)}
                >
                  <span className="staff-live-toggle__dot" aria-hidden="true" />
                  Live now
                  {hasStatus && <span className="staff-live-toggle__count">{liveCount}</span>}
                </button>
              </div>

              <p className="visually-hidden" role="status">
                {groups.reduce((n, g) => n + g.members.length, 0)} staff shown
              </p>

              {groups.length > 0 ? (
                groups.map((group) => (
                  <section key={group.name} className="staff-group" aria-labelledby={`dept-${slug(group.name)}`}>
                    {(departments.length > 1 || group.name !== NO_DEPARTMENT) && (
                      <h2 id={`dept-${slug(group.name)}`} className="staff-group__title">
                        {group.name}
                        <span className="staff-group__count">{String(group.members.length).padStart(2, '0')}</span>
                      </h2>
                    )}
                    <ul role="list" className="staff-grid">
                      {group.members.map((member) => (
                        <StaffCard key={member.id} member={member} status={status} />
                      ))}
                    </ul>
                  </section>
                ))
              ) : (
                <p className="staff-empty">
                  {current === 'all' ? 'No staff are online right now.' : `No one from ${current} is online right now.`}{' '}
                  <button type="button" className="staff-empty__reset" onClick={() => setLiveOnly(false)}>
                    Show everyone
                  </button>
                </p>
              )}
            </>
          ) : (
            <ul role="list" className="staff-grid">
              {Array.from({ length: staffSlots }, (_, i) => (
                <StaffSlot key={i} number={i + 1} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="staff-foot theme-black section" aria-label="Contact">
        <div className="container staff-foot__inner">
          <p className="staff-foot__text">Every resident of the city starts with an application.</p>
          <ApplyLink className="btn btn--primary btn--large">
            Apply now <Arrow />
          </ApplyLink>
        </div>
      </section>
    </>
  )
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function Chip({ active, onClick, label, count }) {
  return (
    <button type="button" className={`staff-chip ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {label}
      <span className="staff-chip__count">{count}</span>
    </button>
  )
}

/** Live status for one staff member, only when the status integration has answered. */
function liveStatus(member, status) {
  if (status.state !== 'ok') return null
  const live = status.byId[String(member.id)]
  if (!live) return { tone: 'offline', label: 'Offline' }
  if (live.onDuty) return { tone: 'duty', label: 'On duty' }
  if (live.online) return { tone: 'online', label: 'Online' }
  return { tone: 'offline', label: 'Offline' }
}

function StaffCard({ member, status }) {
  const live = liveStatus(member, status)
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

  return (
    <li className={`staff-card ${live ? `is-${live.tone}` : ''}`}>
      <div className="staff-card__photo">
        {member.portrait ? (
          <img src={member.portrait} alt={`${member.name}`} loading="lazy" />
        ) : (
          <span className="staff-card__initials" aria-hidden="true">
            {initials}
          </span>
        )}
      </div>
      {live && (
        <span className={`staff-card__live staff-card__live--${live.tone}`}>
          <i aria-hidden="true" />
          {live.label}
        </span>
      )}
      <div className="staff-card__text">
        <p className="staff-card__role">{member.role}</p>
        <p className="staff-card__name">{member.name}</p>
        <SocialLinks links={member.socials} name={member.name} className="staff-card__socials" />
      </div>
    </li>
  )
}

/** An honest placeholder while names and photos aren't published: no name, no status. */
function StaffSlot({ number }) {
  return (
    <li className="staff-card staff-card--slot">
      <div className="staff-card__photo">
        <svg className="staff-card__silhouette" viewBox="0 0 100 120" aria-hidden="true">
          <circle cx="50" cy="42" r="20" />
          <path d="M14 120 C 16 88, 32 74, 50 74 S 84 88, 86 120 Z" />
        </svg>
      </div>
      <div className="staff-card__text">
        <p className="staff-card__role">Staff {String(number).padStart(2, '0')}</p>
        <p className="staff-card__name">To be announced</p>
      </div>
    </li>
  )
}
