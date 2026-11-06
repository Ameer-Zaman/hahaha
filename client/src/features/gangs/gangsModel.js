import { gangs as realGangs, reservedFileCount, wars as realWars } from '../../content/gangs'
import { loadPublic, usePublic } from '../../lib/publicData'

/** Each file gets its own city scene and tint so the reel never repeats itself. */
const SCENES = [
  { seed: 311, horizon: 0.74, tint: 'gold' },
  { seed: 88, horizon: 0.62, tint: 'blue' },
  { seed: 131, horizon: 0.86, tint: 'crimson' },
  { seed: 23, horizon: 0.7, tint: 'gold' },
  { seed: 64, horizon: 0.8, tint: 'blue' },
  { seed: 7, horizon: 0.66, tint: 'crimson' },
]

export const PENDING = 'To be confirmed'

export const formatFileNumber = (n, width = 2) => String(n).padStart(width, '0')

/** Drop-in backdrop for the Nth screen: public/media/gangs/file-01.jpg, file-02.jpg, … */
const slotImage = (index) => `/media/gangs/file-${formatFileNumber(index + 1)}.jpg`

/**
 * Turns the raw gang data into the files the pages render.
 * Confirmed gangs come first; while there are none, numbered reserved files stand in.
 * Keeping this separate means the pages never have to know where the data came from
 * (today a static file, later the API).
 */
export function getArchiveFiles({ gangs = [], wars = [], demo = false } = {}) {
  const nameOf = (id) => gangs.find((g) => g.id === id)?.name ?? 'Unknown gang'
  if (gangs.length > 0) {
    return gangs.map((gang, index) => ({
      key: gang.id,
      slug: gang.id,
      number: index + 1,
      reserved: false,
      title: gang.name,
      type: gang.type ?? 'Gang',
      established: gang.established ?? PENDING,
      territory: gang.territory ?? PENDING,
      leader: gang.leader ?? PENDING,
      suspendedUntil: gang.suspendedUntil ?? null,
      coLeaders: Array.isArray(gang.coLeaders) ? gang.coLeaders : [],
      igl: gang.igl ?? PENDING,
      color: /^#[0-9a-f]{6}$/i.test(gang.color ?? '') ? gang.color : null,
      headline: gang.headline ?? '',
      description: gang.description ?? '',
      image: gang.image ?? slotImage(index),
      emblem: gang.emblem ?? null,
      video: gang.video ?? null,
      verified: Boolean(gang.verified),
      demo,
      members: Array.isArray(gang.members) ? gang.members : [],
      record: getRecord(gang.id, wars, nameOf),
      scene: SCENES[index % SCENES.length],
    }))
  }

  return Array.from({ length: reservedFileCount }, (_, index) => {
    const number = index + 1
    return {
      key: `file-${formatFileNumber(number)}`,
      slug: `file-${formatFileNumber(number)}`,
      number,
      reserved: true,
      title: `Gang ${formatFileNumber(number)}`, // replaced by the real name once supplied
      type: 'Gang',
      established: PENDING,
      territory: PENDING,
      leader: PENDING,
      suspendedUntil: null,
      coLeaders: [],
      igl: PENDING,
      color: null,
      headline: 'A family yet to be confirmed by the administration.',
      description: '',
      image: slotImage(index),
      emblem: null,
      video: null,
      verified: false,
      demo: false,
      members: [],
      record: { wars: [], wins: 0, losses: 0, draws: 0 },
      scene: SCENES[index % SCENES.length],
    }
  })
}

/**
 * The gang files for the pages, and which situation the page is in:
 *   state 'loading' — the first API answer is on its way (a few seconds at most)
 *   state 'ok'      — there are gangs (from the panel, or the built-in content/gangs.js)
 *   state 'empty'   — the API answered, and no gang has been added yet
 *   state 'error'   — the API couldn't be reached and there's nothing built in to show
 * No sample or placeholder gangs are shown: an empty city says so plainly.
 */
export function useGangFiles() {
  const entry = usePublic('/gangs')
  const apiGangs = entry.status === 'ok' ? (entry.data?.gangs ?? []) : null
  let state
  let files = []
  if (entry.status === 'loading') state = 'loading'
  else if (apiGangs?.length) {
    state = 'ok'
    files = getArchiveFiles({ gangs: apiGangs, wars: entry.data.wars ?? [], demo: false })
  } else if (STATIC_FILES.length) {
    state = 'ok'
    files = STATIC_FILES
  } else state = apiGangs || entry.status === 'off' ? 'empty' : 'error'
  return {
    ready: state !== 'loading',
    state,
    source: apiGangs?.length ? 'api' : 'static',
    files,
    retry: () => loadPublic('/gangs', { force: true }),
  }
}

// only real, confirmed gangs written into content/gangs.js (no demo, no reserved files)
const STATIC_FILES = realGangs.length ? getArchiveFiles({ gangs: realGangs, wars: realWars, demo: false }) : []

/** The wars a gang took part in, newest first, each seen from that gang's side. */
function getRecord(gangId, wars, nameOf) {
  const list = wars
    .filter((war) => Array.isArray(war.sides) && war.sides.includes(gangId))
    .map((war) => {
      const opponentId = war.sides.find((id) => id !== gangId)
      const outcome = war.winner == null ? 'draw' : war.winner === gangId ? 'win' : 'loss'
      return {
        id: war.id,
        date: war.date ?? '',
        opponent: opponentId ? nameOf(opponentId) : 'Unknown gang',
        opponentSlug: opponentId ?? null,
        outcome,
        result: war.result ?? '',
      }
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  return {
    wars: list,
    wins: list.filter((w) => w.outcome === 'win').length,
    losses: list.filter((w) => w.outcome === 'loss').length,
    draws: list.filter((w) => w.outcome === 'draw').length,
  }
}
