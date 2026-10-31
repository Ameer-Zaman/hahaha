import { Announcement } from '../models/Announcement.js'
import { Club } from '../models/Club.js'
import { Gang } from '../models/Gang.js'
import { RuleBook } from '../models/RuleBook.js'
import { Settings } from '../models/Settings.js'
import { Staff } from '../models/Staff.js'
import { TdmBoard } from '../models/TdmBoard.js'
import { War } from '../models/War.js'

/**
 * Everything the team has written, in one file.
 *
 * What is in it: the content of the website. What is deliberately not: accounts, the audit
 * log, chat threads and the uploaded files themselves. Accounts and the audit log are the
 * record of who did what — restoring an old copy of those would quietly undo a staff change
 * or erase history, and a file holding password hashes is not something to email around.
 * Pictures and videos stay where they are; a backup refers to them by id, so restoring one
 * next to the media library it came from puts every picture back in place.
 */
export const BACKUP_VERSION = 1

/** The collections a backup carries, in the order they are written and restored. */
const PARTS = [
  { key: 'gangs', model: Gang, label: 'Gangs' },
  { key: 'wars', model: War, label: 'Wars' },
  { key: 'clubs', model: Club, label: 'Clubs' },
  { key: 'staff', model: Staff, label: 'Staff' },
  { key: 'announcements', model: Announcement, label: 'Announcements' },
  { key: 'rules', model: RuleBook, label: 'Rules' },
  { key: 'tdm', model: TdmBoard, label: 'TDM leaderboard' },
  { key: 'settings', model: Settings, label: 'Site settings' },
]

export const partLabels = () => Object.fromEntries(PARTS.map((p) => [p.key, p.label]))

/** Reads everything into a plain object, ready to be written out as JSON. */
export async function makeBackup({ by = '' } = {}) {
  const data = {}
  for (const part of PARTS) {
    data[part.key] = await part.model.find().lean()
  }
  return {
    format: 'rameirah-backup',
    version: BACKUP_VERSION,
    takenAt: new Date().toISOString(),
    takenBy: by,
    counts: Object.fromEntries(PARTS.map((p) => [p.key, data[p.key].length])),
    data,
  }
}

/** Is this really one of our backups? Returns a readable reason when it isn't. */
export function checkBackup(file) {
  if (!file || typeof file !== 'object') return 'That file is not a backup.'
  if (file.format !== 'rameirah-backup') return 'That file is not a backup of this website.'
  if (file.version > BACKUP_VERSION) return 'That backup was made by a newer version of the site than this one.'
  if (!file.data || typeof file.data !== 'object') return 'That backup has no content in it.'
  for (const part of PARTS) {
    const rows = file.data[part.key]
    if (rows !== undefined && !Array.isArray(rows)) return `The ${part.label.toLowerCase()} in that backup are damaged.`
  }
  return null
}

/**
 * What restoring would do, counted before anything is touched, so the panel can show it
 * and a Super Admin can change their mind.
 */
export async function previewRestore(file) {
  const rows = []
  for (const part of PARTS) {
    const incoming = file.data[part.key]
    if (incoming === undefined) continue
    rows.push({
      key: part.key,
      label: part.label,
      now: await part.model.countDocuments(),
      after: incoming.length,
    })
  }
  return rows
}

/**
 * Puts a backup back. Each collection is replaced wholesale — the point of a restore is to
 * get back to exactly how things were, and merging would leave behind whatever was added
 * since. Only the parts present in the file are touched, so an older backup cannot wipe
 * something it never knew about.
 */
export async function restoreBackup(file, { only = null } = {}) {
  const done = []
  for (const part of PARTS) {
    const incoming = file.data[part.key]
    if (incoming === undefined) continue
    if (only && !only.includes(part.key)) continue
    const before = await part.model.countDocuments()
    await part.model.deleteMany({})
    if (incoming.length) await part.model.insertMany(incoming, { ordered: false })
    done.push({ key: part.key, label: part.label, before, after: incoming.length })
  }
  return done
}
