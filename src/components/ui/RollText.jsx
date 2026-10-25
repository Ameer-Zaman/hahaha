import './roll-text.css'

/**
 * Rolling letters: every letter is a tiny two-row strip that rolls up when the text is
 * "rolled" (the `is-rolled` class on any ancestor, or `rolled` here). Letters roll one after
 * another, so mid-way through the line looks sliced — the film-title effect.
 * Screen readers get the plain text once; the letter strips are hidden from them.
 */
export default function RollText({ text, rolled = false, className = '', delay = 0, step = 22 }) {
  const words = String(text).split(/\s+/).filter(Boolean)
  let index = 0
  return (
    <span className={`roll ${rolled ? 'is-rolled' : ''} ${className}`}>
      <span className="visually-hidden">{text}</span>
      <span className="roll__words" aria-hidden="true">
        {words.map((word, w) => (
          <span key={`${word}-${w}`} className="roll__word">
            {[...word].map((ch, c) => {
              const i = index++
              return (
                <span key={c} className="roll__l" style={{ '--d': `${delay + i * step}ms` }}>
                  <span className="roll__in">
                    <span>{ch}</span>
                    <span>{ch}</span>
                  </span>
                </span>
              )
            })}
          </span>
        ))}
      </span>
    </span>
  )
}
