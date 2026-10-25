import './odometer.css'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * A rolling counter: each digit is a vertical strip of 0–9 that rolls to its value, so a
 * change from 03 to 04 (or 000 to 006 on load) reads like a mechanical counter turning.
 * The visible number is mirrored in text for screen readers.
 */
export default function Odometer({ value, width = 2, className = '', label }) {
  const text = String(value).padStart(width, '0')
  return (
    <span className={`odo ${className}`}>
      <span className="visually-hidden">{label ? `${label} ${value}` : value}</span>
      <span className="odo__digits" aria-hidden="true">
        {[...text].map((ch, i) => {
          const d = Number(ch)
          return (
            <span key={i} className="odo__col">
              <span
                className="odo__strip"
                style={{ transform: `translateY(${-d * 10}%)`, transitionDelay: `${(text.length - 1 - i) * 70}ms` }}
              >
                {DIGITS.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
