import { siDiscord, siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube } from 'simple-icons'

/**
 * Social platforms a staff card can link to, in display order, with each brand's own logo
 * (Simple Icons, CC0) and colour. On the black site, X and TikTok use their official
 * dark-mode (white) logos; Instagram uses its gradient.
 */
export const SOCIAL_PLATFORMS = [
  { id: 'discord', label: 'Discord', icon: siDiscord, color: '#5865F2' },
  { id: 'youtube', label: 'YouTube', icon: siYoutube, color: '#FF0000' },
  { id: 'twitch', label: 'Twitch', icon: siTwitch, color: '#9146FF' },
  { id: 'kick', label: 'Kick', icon: siKick, color: '#53FC18' },
  { id: 'tiktok', label: 'TikTok', icon: siTiktok, color: '#FFFFFF' },
  { id: 'instagram', label: 'Instagram', icon: siInstagram, color: '#E1306C' },
  { id: 'x', label: 'X', icon: siX, color: '#FFFFFF' },
  { id: 'facebook', label: 'Facebook', icon: siFacebook, color: '#0866FF' },
]
