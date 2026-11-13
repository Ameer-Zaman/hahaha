/** Reading the rule book's Markdown: the blocks a rule's text is made of, and the same text without marks. */
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

/** The text split into blocks: { type: 'p' | 'ul' | 'ol' | 'table', ... } */
export function parseBlocks(src) {
  const lines = String(src ?? '')
    .replace(/\r/g, '')
    .split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()
    if (!t) {
      i += 1
      continue
    }
    if (t.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim())
      const hasHead = rows.length > 1 && TABLE_RULE.test(rows[1])
      blocks.push({ type: 'table', head: hasHead ? cells(rows[0]) : null, rows: rows.slice(hasHead ? 2 : 0).map(cells) })
      continue
    }
    if (/^[-*] /.test(t)) {
      const items = []
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) items.push(lines[i++].trim().slice(2))
      blocks.push({ type: 'ul', items })
      continue
    }
    const ol = t.match(/^(\d+)[.)] /)
    if (ol) {
      const items = []
      while (i < lines.length && /^\d+[.)] /.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+[.)] /, ''))
      blocks.push({ type: 'ol', start: Number(ol[1]), items })
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^(\||[-*] |\d+[.)] )/.test(lines[i].trim())) para.push(lines[i++].trim())
    blocks.push({ type: 'p', text: para.join(' ') })
  }
  return blocks
}

/** The text without Markdown marks, for copying and searching. */
export const plainText = (text) =>
  parseBlocks(text)
    .map((b) => {
      const clean = (s) =>
        s
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*\s][^*]*)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
      if (b.type === 'ul') return b.items.map((x) => `• ${clean(x)}`).join('\n')
      if (b.type === 'ol') return b.items.map((x, j) => `${b.start + j}. ${clean(x)}`).join('\n')
      if (b.type === 'table')
        return [b.head, ...b.rows]
          .filter(Boolean)
          .map((r) => r.map(clean).join('  |  '))
          .join('\n')
      return clean(b.text)
    })
    .join('\n\n')
