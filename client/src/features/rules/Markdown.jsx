import { Fragment } from 'react'
import { Link } from 'react-router-dom'

import { parseBlocks } from './markdownText'

/*
 * The small piece of Markdown the rule book uses, drawn as React (never as raw HTML, so nothing
 * in a rule can inject markup): paragraphs, "- " and "1. " lists, | tables |, **bold**, *italic*,
 * `code`, and rule numbers (HON-06, PD-1.01) that link to that rule.
 */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Plain text with every match of the search wrapped in <mark>. */
export function Hl({ text, q }) {
  if (!q) return text
  const parts = String(text).split(new RegExp(`(${escapeRe(q)})`, 'ig'))
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\b[A-Z]{2,4}-\d+(?:\.\d+)?\b)/g

function Inline({ text, q, refTo }) {
  const parts = String(text).split(INLINE)
  return parts.map((part, i) => {
    if (!part) return null
    if (i % 2 === 0) return <Hl key={i} text={part} q={q} />
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('**'))
      return (
        <strong key={i}>
          <Inline text={part.slice(2, -2)} q={q} refTo={refTo} />
        </strong>
      )
    if (part.startsWith('*'))
      return (
        <em key={i}>
          <Inline text={part.slice(1, -1)} q={q} refTo={refTo} />
        </em>
      )
    const to = refTo?.(part)
    return to ? (
      <Link key={i} to={to} className="md-ref">
        <Hl text={part} q={q} />
      </Link>
    ) : (
      <Hl key={i} text={part} q={q} />
    )
  })
}

export default function Markdown({ text, q, refTo, className = 'md' }) {
  const blocks = parseBlocks(text)
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.type === 'ul')
          return (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} q={q} refTo={refTo} />
                </li>
              ))}
            </ul>
          )
        if (b.type === 'ol')
          return (
            <ol key={i} start={b.start}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} q={q} refTo={refTo} />
                </li>
              ))}
            </ol>
          )
        if (b.type === 'table')
          return (
            <div key={i} className="md-table" role="region" aria-label="Table" tabIndex={0}>
              <table>
                {b.head && (
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j} scope="col">
                          <Inline text={c} q={q} refTo={refTo} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td key={j}>
                          <Inline text={c} q={q} refTo={refTo} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        // "**Penalty:** …" lines stand out
        const penalty = /^\*\*Penalt(y|ies)[^*]*:?\*\*/i.test(b.text)
        return (
          <p key={i} className={penalty ? 'md-penalty' : undefined}>
            <Inline text={b.text} q={q} refTo={refTo} />
          </p>
        )
      })}
    </div>
  )
}
