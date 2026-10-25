/**
 * Homepage copy. Original, unconfirmed copy — written to be replaced by the team.
 * It deliberately avoids lore, statistics, player counts and dates.
 */

export const hero = {
  primary: 'Apply now',
  secondaryTrailer: 'Watch the trailer',
  secondaryExplore: 'Explore the city',
}

export const welcome = {
  eyebrow: 'Now showing',
  title: ['Welcome', 'to the city'],
  watchLabel: 'Watch on YouTube',
}

export const features = {
  eyebrow: 'What’s inside',
  title: ['More than', 'a server.'],
  aside: 'Everything a resident needs before launch: who runs the city, who runs the streets, what happened, and what’s allowed.',
  rows: [
    {
      id: 'administration',
      title: 'The administration',
      body: 'Meet the people who keep the city running — their names, their roles, and once the server is connected, who is on duty right now.',
      cta: 'Meet the team',
      to: '/admin',
    },
    {
      id: 'gangs',
      title: 'The gangs',
      body: 'An archive of the families that shape the streets: names, emblems and stories, published as the administration confirms them.',
      cta: 'Open the archive',
      to: '/gangs',
    },
    {
      id: 'wars',
      title: 'The war archive',
      body: 'When conflicts are fought, they go on the record — who was involved, when it happened and how it ended. The archive opens with the city.',
      cta: 'See the records',
      to: '/gangs',
    },
    {
      id: 'rules',
      title: 'The rules',
      body: 'Organised by topic and written in plain language, so everyone arrives knowing what kind of city this is.',
      cta: 'Read the rules',
      to: '/rules',
    },
  ],
  tags: ['Serious roleplay', 'Visible administration', 'Gang archive', 'War records', 'Published rules'],
}

export const join = {
  eyebrow: 'How to join',
  /** Last part is set on a gold plate. */
  title: ['Your story starts', 'with', 'an application.'],
  body: 'You don’t need the server to be online to apply.',
  /** A genuine sequence — kept generic until the team confirms the process. */
  steps: [
    { title: 'Apply', detail: 'Join our Discord and fill in the application there: who you are and the character you want to bring.' },
    { title: 'Get reviewed', detail: 'The administration reads every application before launch.' },
    { title: 'Hear back', detail: 'You’ll be contacted with the outcome and what to do next.' },
  ],
  cta: 'Start your application',
}
