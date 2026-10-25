/**
 * Gang data — OFFICIAL, confirmed entries only. Everything here is empty until the
 * administration supplies it. Do not add invented names, members, wars or statistics.
 *
 * ---------------------------------------------------------------------------
 * gangs: one entry per confirmed family. All fields except id/name are optional;
 * anything left out shows "To be confirmed".
 *
 * {
 *   id: 'unique-slug',                 // used in the page address: /gangs/unique-slug
 *   name: 'Gang name',
 *   type: 'Street gang' | 'Crew' | 'Cartel' | 'Motorcycle club' | …,
 *   established: '2026',               // in-city date or season
 *   territory: 'Area of the city',
 *   leader: 'Leader name',             // only if they agree to be named
 *   headline: 'A one-line motto, in their own words',
 *   description: 'A short, confirmed description (shown on their page).',
 *   image: '/media/gangs/unique-slug.jpg',  // optional; otherwise file-01.jpg, file-02.jpg … by position
 *   emblem: '/media/gangs/unique-slug-emblem.png',
 *   verified: true,
 *   members: [                         // the player list on their page
 *     { name: 'Character name', role: 'Leader', since: '2026' },
 *     { name: 'Character name', role: 'Member' },
 *   ],
 * }
 */
export const gangs = []

/**
 * ---------------------------------------------------------------------------
 * wars: the war record. Each war lists the two gang ids involved and how it ended.
 * A gang's page shows every war it took part in, with its own wins and losses.
 *
 * {
 *   id: 'war-001',
 *   date: '2026-11-02',
 *   sides: ['gang-a-id', 'gang-b-id'],
 *   winner: 'gang-a-id',      // or null for a draw / ceasefire
 *   result: 'Territory taken', // short outcome text, optional
 * }
 */
export const wars = []

/**
 * Reserved screens shown while `gangs` is empty. Honest placeholders: numbered files with
 * no names or claims, marked "Reserved" so they can never be mistaken for real gangs.
 */
export const reservedFileCount = 6

/**
 * Show the made-up demo gangs (src/content/gangs.demo.js) while `gangs` is empty, so the
 * pages can be seen filled in. They carry a "Demo data" tag. Set to false to hide them;
 * real entries in `gangs` always replace the demo.
 */
export const useDemoGangs = true
