import { useId } from 'react'
import { SOCIAL_PLATFORMS } from './socialPlatforms'

export function BrandIcon({ platform, size = 18 }) {
  const gradientId = useId()
  const { icon, color, id } = platform
  if (id === 'tiktok') {
    // TikTok's logo: the note with its cyan and red offsets
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
        <path d={icon.path} fill="#25F4EE" transform="translate(-0.9 -0.6)" />
        <path d={icon.path} fill="#FE2C55" transform="translate(0.9 0.6)" />
        <path d={icon.path} fill="#FFFFFF" />
      </svg>
    )
  }
  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={gradientId} cx="0.3" cy="1.07" r="1.3">
            <stop offset="0" stopColor="#FFDD55" />
            <stop offset="0.1" stopColor="#FFDD55" />
            <stop offset="0.5" stopColor="#FF543E" />
            <stop offset="1" stopColor="#C837AB" />
          </radialGradient>
        </defs>
        <path d={icon.path} fill={`url(#${gradientId})`} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={icon.path} fill={color} />
    </svg>
  )
}

/** The row of social links at the bottom of a staff card. Renders nothing when there are none. */
export function SocialLinks({ links, name, className = '' }) {
  const items = SOCIAL_PLATFORMS.filter((p) => typeof links?.[p.id] === 'string' && links[p.id].startsWith('https://'))
  if (items.length === 0) return null
  return (
    <ul role="list" className={`social-links ${className}`}>
      {items.map((p) => (
        <li key={p.id}>
          <a
            href={links[p.id]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="social-links__link"
            style={{ '--brand': p.color }}
            aria-label={`${name} on ${p.label} (opens in a new tab)`}
            title={p.label}
          >
            <BrandIcon platform={p} />
          </a>
        </li>
      ))}
    </ul>
  )
}
