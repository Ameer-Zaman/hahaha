/** Small icons for configured community links. Unknown ids fall back to a link glyph. */
const paths = {
  // Generic chat glyph (not the Discord trademark logo)
  discord:
    'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  youtube:
    'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
}

export default function SocialIcon({ id }) {
  const isStroke = !paths[id]
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d={paths[id] ?? paths.link}
        fill={isStroke ? 'none' : 'currentColor'}
        fillRule="evenodd"
        stroke={isStroke ? 'currentColor' : 'none'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
