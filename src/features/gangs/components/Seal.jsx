/**
 * A laurel seal, the way festival selections are marked on a film poster. It only states
 * facts the site actually knows: whether the file is confirmed, and its number.
 * When the gang has its own emblem, that is shown instead.
 */
const LEAVES = Array.from({ length: 7 }, (_, i) => i)

function Branch({ flip = false }) {
  return (
    <g transform={flip ? 'translate(100 0) scale(-1 1)' : undefined}>
      <path d="M38 86 C 20 74, 12 52, 18 26" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {LEAVES.map((i) => {
        const t = i / (LEAVES.length - 1)
        // points along the stem, leaves angled outwards
        const x = 36 - t * 20 + Math.sin(t * Math.PI) * -4
        const y = 84 - t * 58
        const angle = -60 + t * 50
        return (
          <ellipse
            key={i}
            cx={x - 5}
            cy={y}
            rx="7.5"
            ry="3.1"
            fill="currentColor"
            transform={`rotate(${angle} ${x - 5} ${y})`}
          />
        )
      })}
    </g>
  )
}

export default function Seal({ file, siteName }) {
  if (file.emblem) {
    return <img className="seal seal--emblem" src={file.emblem} alt={`${file.title} emblem`} loading="lazy" />
  }
  return (
    <svg className="seal" viewBox="0 0 100 100" role="img" aria-label={file.verified ? `${siteName} official family` : `${siteName} family file`}>
      <Branch />
      <Branch flip />
      <text x="50" y="40" textAnchor="middle" className="seal__small">
        {file.verified ? 'Official family' : 'Family file'}
      </text>
      <text x="50" y="54" textAnchor="middle" className="seal__big">
        {siteName}
      </text>
      <text x="50" y="66" textAnchor="middle" className="seal__small">
        File {String(file.number).padStart(2, '0')}
      </text>
    </svg>
  )
}
