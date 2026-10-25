/**
 * The Story page — DRAFT copy. Rewrite freely: nothing here is an official fact about the
 * server (no dates, numbers or names are claimed).
 *
 * Media: drop video files into public/assets/video/story/ with these names (or change the
 * paths). Scene videos SCRUB with the scroll, so encode them with frequent keyframes for
 * smooth seeking (see README → "Story page videos"). Until a file exists, an illustrated
 * skyline stands in, with the same motion.
 */
export const storyIntro = {
  tagline: 'Every city has a story. This one is written by the people who live in it.',
}

export const chapters = [
  {
    id: 'city',
    kicker: 'Chapter one',
    title: 'The City',
    video: '/assets/video/story/city.mp4',
    image: null, // optional still shown before the video loads, e.g. '/media/story/city.jpg'
    scene: { seed: 311, horizon: 0.74, tint: 'gold' },
    lead: 'Nobody arrives here by accident.',
    body: [
      'Shyastha is a serious roleplay city: a place where every character has a past, every deal has a price, and every choice leaves a mark on the streets.',
      'It never sleeps and it never forgets. What happens next is up to the people who walk it.',
    ],
    cards: [
      { video: '/assets/video/story/city-a.mp4', image: null, scene: { seed: 88, horizon: 0.62, tint: 'blue' }, speed: -14, shape: 'square' },
      { video: '/assets/video/story/city-b.mp4', image: null, scene: { seed: 23, horizon: 0.7, tint: 'gold' }, speed: 10, shape: 'wide' },
    ],
    link: null,
    quote: {
      text: 'Keep your head down and your story straight.',
      line: 'Another night in paradise.',
      video: '/assets/video/story/quote-1.mp4',
      image: null,
      scene: { seed: 131, horizon: 0.86, tint: 'crimson' },
    },
  },
  {
    id: 'streets',
    kicker: 'Chapter two',
    title: 'The Streets',
    video: '/assets/video/story/streets.mp4',
    image: null,
    scene: { seed: 64, horizon: 0.8, tint: 'crimson' },
    lead: 'Respect is earned one block at a time.',
    body: [
      'Families and crews hold their corners of the city. Alliances shift, territory changes hands, and every war leaves a record.',
      'Some run the streets. Most just try to survive them.',
    ],
    cards: [
      { video: '/assets/video/story/streets-a.mp4', image: null, scene: { seed: 7, horizon: 0.66, tint: 'crimson' }, speed: -18, shape: 'wide' },
      { video: '/assets/video/story/streets-b.mp4', image: null, scene: { seed: 42, horizon: 0.78, tint: 'gold' }, speed: 12, shape: 'square' },
    ],
    link: { label: 'Meet the gangs', to: '/gangs' },
    quote: {
      text: 'If anything happens, you never saw me.',
      line: 'Loyalty is the only currency that holds its value.',
      video: '/assets/video/story/quote-2.mp4',
      image: null,
      scene: { seed: 211, horizon: 0.72, tint: 'blue' },
    },
  },
  {
    id: 'night',
    kicker: 'Chapter three',
    title: 'After Dark',
    video: '/assets/video/story/night.mp4',
    image: null,
    scene: { seed: 19, horizon: 0.68, tint: 'blue' },
    lead: 'When the sun goes down, the city changes its face.',
    body: [
      'The clubs fill up, the deals get bigger and the music gets louder. Behind every velvet rope there is someone with something to hide.',
    ],
    cards: [
      { video: '/assets/video/story/night-a.mp4', image: null, scene: { seed: 77, horizon: 0.74, tint: 'blue' }, speed: -12, shape: 'square' },
      { video: '/assets/video/story/night-b.mp4', image: null, scene: { seed: 5, horizon: 0.84, tint: 'crimson' }, speed: 16, shape: 'wide' },
    ],
    link: { label: 'See the clubs', to: '/clubs' },
    quote: null,
  },
]

export const storyOutro = {
  title: 'Your story starts here.',
  body: 'Read the rules, make your character, and apply on Discord. The city is waiting.',
}
