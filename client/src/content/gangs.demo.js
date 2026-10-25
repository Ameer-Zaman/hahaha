/**
 * DEMO gang data — made-up gangs, players and wars so the Gangs pages can be seen filled in.
 * None of it is real. Every page that shows it carries a "Demo data" tag.
 *
 * To switch it off: set `useDemoGangs = false` in src/content/gangs.js, or simply add your
 * real gangs to `gangs` there (real data always replaces the demo).
 */
export const demoGangs = [
  {
    id: 'night-serpents',
    name: 'Night Serpents',
    type: 'Street gang',
    established: '2026',
    territory: 'Harbor Row',
    leader: 'Viktor Hale',
    headline: 'Quiet streets, loud nights.',
    members: [
      { name: 'Viktor Hale', role: 'Leader' },
      { name: 'Mara Quinn', role: 'Shot caller' },
      { name: 'Dex Romero', role: 'Enforcer' },
      { name: 'Jonah Pike', role: 'Member' },
      { name: 'Lena Cruz', role: 'Member' },
    ],
  },
  {
    id: 'iron-saints',
    name: 'Iron Saints MC',
    type: 'Motorcycle club',
    established: '2026',
    territory: 'Northern Hills',
    leader: 'Cole Brannigan',
    headline: 'Ride together, answer together.',
    members: [
      { name: 'Cole Brannigan', role: 'President' },
      { name: 'Wade Turner', role: 'Vice president' },
      { name: 'Rusty Kane', role: 'Road captain' },
      { name: 'Sal Moretti', role: 'Member' },
      { name: 'Ivy Locke', role: 'Prospect' },
    ],
  },
  {
    id: 'dockside-cartel',
    name: 'Dockside Cartel',
    type: 'Cartel',
    established: '2026',
    territory: 'The Docks',
    leader: 'Rafael Ortega',
    headline: 'Everything that comes in, goes through us.',
    members: [
      { name: 'Rafael Ortega', role: 'Boss' },
      { name: 'Inés Vargas', role: 'Lieutenant' },
      { name: 'Tomas Reyes', role: 'Enforcer' },
      { name: 'Paco Silva', role: 'Member' },
    ],
  },
  {
    id: 'southside-kings',
    name: 'Southside Kings',
    type: 'Street gang',
    established: '2026',
    territory: 'Eastside',
    leader: 'Andre Mills',
    headline: 'The block remembers.',
    members: [
      { name: 'Andre Mills', role: 'Leader' },
      { name: 'Kiara Banks', role: 'Shot caller' },
      { name: 'Tyrell Stone', role: 'Enforcer' },
      { name: 'Marcus Reed', role: 'Member' },
      { name: 'Deja Hart', role: 'Member' },
      { name: 'Leon Price', role: 'Prospect' },
    ],
  },
  {
    id: 'velvet-syndicate',
    name: 'Velvet Syndicate',
    type: 'Crew',
    established: '2026',
    territory: 'Midtown',
    leader: 'Eleanor Voss',
    headline: 'Business first. Always.',
    members: [
      { name: 'Eleanor Voss', role: 'Head' },
      { name: 'Julian Ashford', role: 'Fixer' },
      { name: 'Nadia Petrova', role: 'Member' },
      { name: 'Felix Grant', role: 'Member' },
    ],
  },
  {
    id: 'hollow-crows',
    name: 'Hollow Crows',
    type: 'Street gang',
    established: '2026',
    territory: 'Old Quarter',
    leader: 'Silas Grey',
    headline: 'We see everything.',
    members: [
      { name: 'Silas Grey', role: 'Leader' },
      { name: 'Rhea Kim', role: 'Shot caller' },
      { name: 'Bo Langley', role: 'Enforcer' },
      { name: 'Nico Ferro', role: 'Member' },
      { name: 'June Park', role: 'Member' },
    ],
  },
]

export const demoWars = [
  { id: 'demo-w01', date: '2026-09-04', sides: ['night-serpents', 'southside-kings'], winner: 'night-serpents', result: 'Territory held' },
  { id: 'demo-w02', date: '2026-09-11', sides: ['iron-saints', 'dockside-cartel'], winner: 'dockside-cartel', result: 'Supply route taken' },
  { id: 'demo-w03', date: '2026-09-18', sides: ['hollow-crows', 'velvet-syndicate'], winner: null, result: 'Ceasefire' },
  { id: 'demo-w04', date: '2026-09-25', sides: ['southside-kings', 'hollow-crows'], winner: 'southside-kings', result: 'Block taken' },
  { id: 'demo-w05', date: '2026-10-02', sides: ['dockside-cartel', 'night-serpents'], winner: 'night-serpents', result: 'Shipment seized' },
  { id: 'demo-w06', date: '2026-10-09', sides: ['velvet-syndicate', 'iron-saints'], winner: 'iron-saints', result: 'Debt settled' },
  { id: 'demo-w07', date: '2026-10-16', sides: ['hollow-crows', 'dockside-cartel'], winner: 'hollow-crows', result: 'Warehouse burned' },
  { id: 'demo-w08', date: '2026-10-21', sides: ['southside-kings', 'iron-saints'], winner: null, result: 'Truce' },
  { id: 'demo-w09', date: '2026-10-23', sides: ['velvet-syndicate', 'night-serpents'], winner: 'velvet-syndicate', result: 'Club taken over' },
]
