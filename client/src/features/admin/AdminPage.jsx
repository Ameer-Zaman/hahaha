
import usePageTitle from '../../hooks/usePageTitle'
import { staffSlots } from '../../content/staff'
import useStaffStatus from './useStaffStatus'
import './admin.css'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import ApplyLink from '../../components/ui/ApplyLink'

const STATUS_COPY = {
  'not-connected': {
    title: 'Live status is not published yet',
    body: 'Online and on-duty status appears here once the team starts posting it. Until then, no status is shown — anything else would be a guess.',
  },
  loading: { title: 'Checking who is on duty', body: 'Contacting the server.' },
  error: {
    title: 'Live status is unavailable right now',
    body: 'The status service did not answer. Staff are still listed below; their status will return when the connection does.',
  },
}

export default function AdminPage() {
  usePageTitle('Administration')
  const status = useStaffStatus()
  const { staff } = status

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="admin-title">
        <ParallaxWord text="Staff" motion="x:6%:-10%" className="page-head__word" />
        <div className="container admin-head">
          <div>
            <h1 id="admin-title" className="page-head__title">
              Administration
            </h1>
            <p className="lede">
              The people who run the city: who they are, what they look after and who is on
              duty right now.
            </p>
          </div>
          {status.state === 'ok' ? (
            status.updatedAt && (
              <p className="admin-updated">
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

      <section className="admin-dir theme-black section" aria-label="Staff">
        <div className="container">
          <ul role="list" className="staff-grid">
            {staff.length > 0
              ? staff.map((member) => <StaffCard key={member.id} member={member} status={status} />)
              : Array.from({ length: staffSlots }, (_, i) => <StaffSlot key={i} number={i + 1} />)}
          </ul>
        </div>
      </section>

      <section className="admin-foot theme-black section" aria-label="Contact">
        <div className="container admin-foot__inner">
          <p className="admin-foot__text">Every resident of the city starts with an application.</p>
          <ApplyLink className="btn btn--primary btn--large">
            Apply now <Arrow />
          </ApplyLink>
        </div>
      </section>
    </>
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
