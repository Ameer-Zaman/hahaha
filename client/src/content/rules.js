/**
 * Server rules.
 *
 * STATUS: DRAFT. These are common roleplay conventions written as a starting point for the
 * team to edit. They are NOT the community's published rules until `status` is set to
 * 'published' — the Rules page shows a clear draft notice while it is 'draft'.
 *
 * Each category: { id, title, summary, rules: [{ id, title, text }] }
 * Rule ids are used as stable anchors (e.g. /rules#general-respect).
 */
export const rulesMeta = {
  status: 'draft', // 'draft' | 'published'
  lastUpdated: null, // ISO date string once published, e.g. '2026-11-01'
}

export const ruleCategories = [
  {
    id: 'general',
    title: 'General conduct',
    summary: 'How everyone treats each other, in character and out.',
    rules: [
      {
        id: 'general-respect',
        title: 'Respect other players',
        text: 'Harassment, discrimination and targeted abuse are not tolerated, in character or out of it. Characters can be rough; players cannot.',
      },
      {
        id: 'general-staff',
        title: 'Follow staff direction',
        text: 'If a member of staff asks you to pause or move a situation, do so. Disagreements are raised afterwards through the proper channel, not in the moment.',
      },
      {
        id: 'general-exploits',
        title: 'No cheats or exploits',
        text: 'Third-party cheats, mod menus and deliberate abuse of bugs result in removal. Report bugs you find instead of using them.',
      },
    ],
  },
  {
    id: 'roleplay',
    title: 'Roleplay standards',
    summary: 'What it means to stay in character and play fair.',
    rules: [
      {
        id: 'roleplay-character',
        title: 'Stay in character',
        text: 'Out-of-character talk belongs in the designated channels. Breaking character in a live scene should only happen when necessary.',
      },
      {
        id: 'roleplay-metagaming',
        title: 'No metagaming',
        text: 'Your character only knows what they have learned in the city. Information from streams, Discord or other sources cannot be used in character.',
      },
      {
        id: 'roleplay-powergaming',
        title: 'No powergaming',
        text: 'Give other players a fair chance to respond. Do not force outcomes on someone else\'s character or act in ways no real person could.',
      },
      {
        id: 'roleplay-fear',
        title: 'Value your life',
        text: 'Act as a real person would when threatened. Ignoring danger to win a scene breaks the story for everyone involved.',
      },
    ],
  },
  {
    id: 'conflict',
    title: 'Conflict and combat',
    summary: 'Violence is part of the city when it grows out of a story.',
    rules: [
      {
        id: 'conflict-rdm',
        title: 'No random violence',
        text: 'Attacking another player without a roleplay reason is not allowed. There must be a story before there is a fight.',
      },
      {
        id: 'conflict-vdm',
        title: 'No vehicle ramming as a weapon',
        text: 'Using a vehicle to attack players without a roleplay reason is treated the same as random violence.',
      },
      {
        id: 'conflict-new-life',
        title: 'Respect the new-life rule',
        text: 'After your character is incapacitated and respawns, they do not remember the events that led to it and must not return to the scene.',
      },
    ],
  },
  {
    id: 'gangs',
    title: 'Gangs and wars',
    summary: 'How organised groups operate and how wars are declared.',
    rules: [
      {
        id: 'gangs-recognition',
        title: 'Recognised gangs only',
        text: 'Only gangs recognised by the administration can hold territory or declare wars. Recognition is requested through staff.',
      },
      {
        id: 'gangs-war-declaration',
        title: 'Wars must be declared',
        text: 'A war starts only once it has been declared through the agreed process, so both sides and staff know it is happening and it can be recorded.',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community spaces',
    summary: 'Discord, reports and appeals.',
    rules: [
      {
        id: 'community-reports',
        title: 'Report through the proper channel',
        text: 'Reports are made privately to staff with as much detail as possible. Public call-outs are not the way to resolve disputes.',
      },
      {
        id: 'community-appeals',
        title: 'Appeals are reviewed fairly',
        text: 'Anyone who is sanctioned can appeal. Appeals are reviewed by a different member of staff where possible.',
      },
    ],
  },
]
