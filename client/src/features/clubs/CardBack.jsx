/**
 * Original art-deco card back in black & gold: double frame with corner studs, sunburst
 * corners, beaded side rails, stacked chevrons and a centre medallion with the brand diamond.
 */
import { useId } from 'react'

const G = 'var(--c-gold, #e3b55a)'

function Sunburst({ cx, cy, r, from, to }) {
  // quarter fan of rays between angles `from` → `to` (degrees)
  const rays = []
  for (let a = from; a <= to; a += 15) {
    const rad = (a * Math.PI) / 180
    rays.push(<line key={a} x1={cx} y1={cy} x2={cx + Math.cos(rad) * r} y2={cy + Math.sin(rad) * r} />)
  }
  const arc = (rr) => {
    const p = (deg) => [cx + Math.cos((deg * Math.PI) / 180) * rr, cy + Math.sin((deg * Math.PI) / 180) * rr]
    const [x1, y1] = p(from)
    const [x2, y2] = p(to)
    return <path d={`M${x1} ${y1} A${rr} ${rr} 0 0 1 ${x2} ${y2}`} />
  }
  return (
    <g>
      {rays}
      {arc(r)}
      {arc(r * 0.62)}
    </g>
  )
}

function Rail({ x }) {
  return (
    <g>
      <line x1={x} y1={70} x2={x} y2={280} />
      {[92, 112, 132, 218, 238, 258].map((y) => (
        <circle key={y} cx={x} cy={y} r="3.2" fill="#0b0b0e" />
      ))}
    </g>
  )
}

export default function CardBack() {
  const clip = `cb-${useId().replace(/:/g, '')}`
  // stripes parallel to the diamond's upper-left edge, spaced evenly
  const stripes = Array.from({ length: 26 }, (_, k) => -40 + k * 8.5)
  return (
    <svg className="club-card__art" viewBox="0 0 250 350" aria-hidden="true" focusable="false">
      <rect width="250" height="350" rx="16" fill="#0b0b0e" />
      <g fill="none" stroke={G} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {/* frames */}
        <rect x="7" y="7" width="236" height="336" rx="11" strokeWidth="2.6" />
        <rect x="17" y="17" width="216" height="316" rx="4" />
        <rect x="23" y="23" width="204" height="304" rx="2" opacity="0.55" />
        {[[17, 17], [233, 17], [17, 333], [233, 333]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill="#0b0b0e" strokeWidth="1.6" />
        ))}

        {/* sunburst corners */}
        <Sunburst cx={23} cy={23} r={46} from={0} to={90} />
        <Sunburst cx={227} cy={23} r={46} from={90} to={180} />
        <Sunburst cx={23} cy={327} r={46} from={270} to={360} />
        <Sunburst cx={227} cy={327} r={46} from={180} to={270} />

        {/* beaded side rails */}
        <Rail x={38} />
        <Rail x={212} />

        {/* top & bottom stacked chevrons */}
        {[0, 9, 18].map((d) => (
          <g key={d}>
            <path d={`M78 ${38 + d} L125 ${70 + d} L172 ${38 + d}`} />
            <path d={`M78 ${312 - d} L125 ${280 - d} L172 ${312 - d}`} />
          </g>
        ))}
        <circle cx="125" cy="38" r="6" />
        <circle cx="125" cy="312" r="6" />

        {/* central diamond, nested */}
        <path d="M125 72 L203 175 L125 278 L47 175 Z" strokeWidth="1.8" />
        <path d="M125 90 L189 175 L125 260 L61 175 Z" opacity="0.7" />
        {/* striped quarters (upper-left and lower-right), clipped to the inner diamond */}
        <defs>
          <clipPath id={clip}>
            <path d="M125 90 L61 175 L125 175 Z M125 260 L189 175 L125 175 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`} opacity="0.6" strokeWidth="1.1">
          {stripes.map((o) => (
            <line key={o} x1={40 + o} y1={90} x2={40 + o + 128} y2={260} />
          ))}
        </g>
        {/* side arrows */}
        <path d="M61 175 L82 162 L82 188 Z" fill={G} stroke="none" />
        <path d="M189 175 L168 162 L168 188 Z" fill={G} stroke="none" />

        {/* medallion */}
        <path
          d="M125 133 C140 133 146 141 154 146 C162 151 167 160 167 175 C167 190 162 199 154 204 C146 209 140 217 125 217 C110 217 104 209 96 204 C88 199 83 190 83 175 C83 160 88 151 96 146 C104 141 110 133 125 133 Z"
          fill="#0b0b0e"
          strokeWidth="1.8"
        />
        <circle cx="125" cy="175" r="27" />
        <circle cx="125" cy="175" r="22" opacity="0.6" />
        {[[125, 141], [159, 175], [125, 209], [91, 175]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={G} stroke="none" />
        ))}
        {/* the brand diamond */}
        <rect x="113" y="163" width="24" height="24" transform="rotate(45 125 175)" strokeWidth="2.2" />
        <rect x="120" y="170" width="10" height="10" transform="rotate(45 125 175)" fill={G} stroke="none" />
      </g>
    </svg>
  )
}
