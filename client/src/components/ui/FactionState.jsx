import { Link } from 'react-router-dom'

import { useCommunityLinks } from '../../lib/siteSettings'
import Arrow from './Arrow'
import './faction-state.css'

const COPY = {
  empty: {
    gangs: {
      title: 'No gangs in the city yet',
      body: 'The administration hasn’t confirmed any gangs so far. When it does, each one shows up here with its crew, its colours, its war record and its players.',
    },
    clubs: {
      title: 'No clubs open yet',
      body: 'No club has been added so far. When the first one opens its doors, it’s dealt onto the table here with its owner and where to find it.',
    },
  },
  error: {
    gangs: {
      title: 'The gangs can’t be loaded right now',
      body: 'The website couldn’t reach the server. It may be waking up — this usually sorts itself out within a minute.',
    },
    clubs: {
      title: 'The clubs can’t be loaded right now',
      body: 'The website couldn’t reach the server. It may be waking up — this usually sorts itself out within a minute.',
    },
  },
}

/**
 * What a faction page (Gangs, Clubs) shows when it has nothing to show — either nothing has
 * been added yet ('empty'), or the server couldn't be reached ('error', with Try again).
 */
export default function FactionState({ kind = 'empty', faction = 'gangs', onRetry }) {
  const copy = COPY[kind][faction]
  const discord = useCommunityLinks().find((l) => l.id === 'discord')?.url
  const word = faction === 'clubs' ? 'Clubs' : 'Gangs'
  return (
    <section className={`fstate fstate--${kind} theme-black`} aria-labelledby="fstate-title">
      <span className="fstate__word" aria-hidden="true">
        {word}
      </span>
      <div className="container fstate__inner">
        <p className="fstate__kicker">
          <span className="fstate__dot" aria-hidden="true" />
          {kind === 'error' ? 'Connection problem' : `${word} · nothing here yet`}
        </p>
        <h1 id="fstate-title" className="fstate__title">
          {copy.title}
        </h1>
        <p className="fstate__body" role={kind === 'error' ? 'status' : undefined}>
          {copy.body}
        </p>
        <div className="fstate__actions">
          {kind === 'error' && onRetry && (
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              Try again
            </button>
          )}
          {discord && (
            <a
              className={`btn ${kind === 'error' ? 'btn--ghost' : 'btn--primary'}`}
              href={discord}
              target="_blank"
              rel="noopener noreferrer"
            >
              {kind === 'error' ? 'Check the Discord' : 'Follow the Discord for news'} <Arrow />
            </a>
          )}
          <Link to="/" className="btn btn--ghost">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
