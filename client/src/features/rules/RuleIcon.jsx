/** The small line icon beside a rule book's name. Unknown names get the open book. */
const PATHS = {
  Users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" />
      <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.8c1.7.6 3 2.2 3.4 4.7" />
    </>
  ),
  Scroll: (
    <>
      <path d="M7 4h11a2 2 0 0 1 2 2v1h-4" />
      <path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10" />
      <path d="M7 4a2 2 0 0 0-2 2v11M9 9h4M9 12.5h4" />
    </>
  ),
  BookOpen: (
    <>
      <path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  ShieldAlert: (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 3 7.8 7 9.5 4-1.7 7-5.1 7-9.5V6l-7-3Z" />
      <path d="M12 8.5v4M12 15.6v.1" />
    </>
  ),
  ShieldCheck: (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 3 7.8 7 9.5 4-1.7 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  Gavel: (
    <>
      <path d="m13.5 4.5 6 6M11 7l6 6M12.2 5.8l4-1.3 3.3 3.3-1.3 4M14 11l-8.5 8.5a1.6 1.6 0 0 1-2.2-2.2L11.8 9" />
      <path d="M13 20.5h8" />
    </>
  ),
  Video: (
    <>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2" />
      <path d="m15.5 10.5 5-3v9l-5-3" />
    </>
  ),
  HeartHandshake: (
    <>
      <path d="M12 6.2C10.3 4.2 7 3.9 5 6c-2 2-1.7 5.2.3 7.2L12 20l6.7-6.8c2-2 2.3-5.2.3-7.2-2-2.1-5.3-1.8-7 .2Z" />
      <path d="m12 6.2-2.6 2.6a1.5 1.5 0 0 0 2.1 2.1l1.2-1.1 3.3 3.3" />
    </>
  ),
}

export default function RuleIcon({ name, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.BookOpen}
    </svg>
  )
}
