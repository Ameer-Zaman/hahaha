/**
 * The parts of the panel a Super Admin opens or closes for each Admin (Panel → Accounts →
 * Pages). The server checks the same list on every request (server/src/middleware/access.js);
 * here it only decides what to show.
 */
export const AREA_GROUPS = [
  {
    group: 'Website',
    areas: [
      { key: 'site', label: 'Sections & maintenance', hint: 'Sections on/off, maintenance, logo, community links' },
      { key: 'live', label: 'Live now' },
      { key: 'announcements', label: 'Announcements' },
      { key: 'chat', label: 'Rules help chat' },
    ],
  },
  {
    group: 'Content',
    areas: [
      { key: 'gangs', label: 'Gangs & players' },
      { key: 'wars', label: 'Wars' },
      { key: 'clubs', label: 'Clubs' },
      { key: 'events', label: 'Events' },
      { key: 'tdm', label: 'TDM leaderboard' },
      { key: 'staff', label: 'Staff' },
      { key: 'creators', label: 'Creators' },
      { key: 'store', label: 'Store' },
      { key: 'rules', label: 'Rules' },
    ],
  },
  {
    group: 'Media',
    areas: [
      { key: 'media', label: 'Media library', hint: 'Deleting files. Choosing and uploading pictures works in every page they can open.' },
      { key: 'homeMedia', label: 'Homepage media' },
      { key: 'storyMedia', label: 'Story media' },
    ],
  },
]

export const ALL_AREAS = AREA_GROUPS.flatMap((g) => g.areas.map((a) => a.key))

/** Super Admins: everything. Admins: what was ticked for them (never set = everything). */
export function canOpen(user, area) {
  if (!user) return false
  if (user.role === 'superadmin') return true
  if (!Array.isArray(user.access)) return true
  return user.access.includes(area)
}
