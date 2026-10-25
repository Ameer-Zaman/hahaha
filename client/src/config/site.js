/**
 * Site configuration — the single place to change identity, links and integrations.
 *
 * Everything here is either a placeholder or empty on purpose. Nothing in this file
 * is an official fact about the community until the team replaces it.
 */

export const site = {
  /** The community's name. Used in the header, hero, footer and <title>. */
  name: 'Shyastha',

  /** Short line under the name in the hero. Keep it factual: the server has not launched. */
  tagline: 'A serious roleplay city, in preparation.',

  /** The welcome screen: small line above the name, and the gold badge below it ('' = no badge). */
  welcome: { kicker: 'Welcome to', badge: 'Roleplay City' },

  /** Shown in the footer and meta description. */
  description:
    'A FiveM roleplay community preparing for launch. Read the rules, meet the staff and apply before the city opens.',

  /**
   * Launch status. Keep `isLive: false` until the game server is actually open to players.
   * `launchDate` stays null until the team announces a confirmed date (ISO string, e.g. '2027-01-15').
   */
  launch: {
    isLive: false,
    launchDate: null,
  },
}

/**
 * Community links. Leave `url` empty until the official link exists — empty links are
 * hidden and the footer shows a neutral "links coming soon" note instead.
 */
/**
 * The Discord invite. Applications are handled on Discord, so every "Apply" button on the
 * site opens this link. Paste the official invite here, e.g. 'https://discord.gg/xxxxxxx'.
 */
const DISCORD_INVITE = 'https://discord.gg/Dtd3DSej6'

export const communityLinks = [
  { id: 'discord', label: 'Discord', url: DISCORD_INVITE },
  { id: 'youtube', label: 'YouTube', url: '' },
  { id: 'tiktok', label: 'TikTok', url: '' },
  { id: 'instagram', label: 'Instagram', url: '' },
]

/**
 * Media. Every slot is optional. When a slot is null — or its file hasn't been added yet —
 * the site renders its original illustrated city plate instead, so pages never show a
 * broken image. The image slots below are pre-wired: drop a file with that exact name into
 * public/media/home/ or public/media/gangs/ and it appears.
 *
 * Put optimised files in /public/media (WebP/AVIF, ~1920px wide for full-bleed, under ~300 KB)
 * and reference them as '/media/filename.webp'.
 */
export const media = {
  hero: {
    image: null, // e.g. '/media/hero.webp' — shown until the video starts, and if it can't play
    /** Self-hosted background video for the hero (muted loop; visitors can turn sound on). */
    video: '/assets/video/home.mp4', // drop the file in public/assets/video/
    videoPoster: null, // e.g. '/media/home-poster.webp' — first frame, shown while it loads
  },
  /** "Welcome to the city" banner. */
  trailer: {
    image: null, // shown until the video starts, and if it can't play
    /** Muted, looping background video for the banner — drop the file in public/assets/video/. */
    video: '/assets/video/welcome.mp4',
    /** "Watch on YouTube" button. Empty = no button. */
    youtubeUrl: 'https://www.youtube.com/watch?v=Fb04ewMi1Wg',
    /**
     * Credit shown on the banner, so a third-party video is never passed off as our own.
     * Clear it ('') if the video is the community's own footage.
     */
    credit: 'Video: “The Raid” by Marco Studios',
  },
  /** Images for the feature rows on the homepage. */
  features: {
    administration: '/media/home/administration.jpg',
    gangs: '/media/home/gangs.jpg',
    wars: '/media/home/wars.jpg',
    rules: '/media/home/rules.jpg',
  },
  /** Background of the "Your story starts with an application" section. */
  join: { image: '/media/home/join.jpg' },
  gangsOpening: { image: '/media/gangs/opening.jpg' },
  /** Welcome screen sound, played along with the scroll. Swap in any MP3 (keep it short). */
  introSound: '/assets/audio/intro.mp3',
  /** Background music after the welcome sound (loops). Swap in any MP3; empty = no music. */
  music: '/assets/audio/music.mp3',
}

/**
 * Integrations. Empty values mean "not connected" and the UI says so honestly.
 */
export const integrations = {
  /** GET endpoint for live staff status (Admin page). Empty = not connected. */
  staffStatusEndpoint: import.meta.env.VITE_STAFF_STATUS_ENDPOINT ?? '',
}

/**
 * Primary navigation. Apply Now is rendered as the CTA.
 * An item with `children` becomes a dropdown (desktop) / expandable group (phone menu).
 */
export const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Story', to: '/story' },
  { label: 'Staffs', to: '/staff' },
  {
    label: 'Factions', // the dropdown's name — rename freely
    children: [
      { label: 'Gangs', to: '/gangs', hint: 'Crews, war records, players' },
      { label: 'Clubs', to: '/clubs', hint: 'The clubs of the city' },
    ],
  },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Rules', to: '/rules' },
]

/** Every page link in the navigation, dropdowns flattened (footer, sitemaps). */
export const navigationLinks = navigation.flatMap((item) => item.children ?? [item])

/** Apply Now opens the Discord server (there is no application page on the site). */
export const applyLink = { label: 'Apply Now', href: DISCORD_INVITE }
