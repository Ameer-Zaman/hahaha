import { BrandIcon } from './BrandIcons'
import { SOCIAL_PLATFORMS } from './socialPlatforms'

/** The real logo of a community link (Discord, YouTube, TikTok …) in its brand colours. Unknown ids get a link glyph. */
export default function SocialIcon({ id, size = 20 }) {
  const platform = SOCIAL_PLATFORMS.find((p) => p.id === id)
  if (platform) return <BrandIcon platform={platform} size={size} />
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
