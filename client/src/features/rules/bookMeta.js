/**
 * Shared by the Rules page and Panel → Rules: how serious a rule is, and the icons a book can have.
 */
export const SEVERITIES = [
  { value: 'critical', label: 'Critical', level: 'zero' },
  { value: 'high', label: 'High', level: 'serious' },
  { value: 'medium', label: 'Medium', level: 'standard' },
  { value: 'low', label: 'Low', level: 'standard' },
]
const FROM_LEVEL = { zero: 'critical', serious: 'high', standard: 'medium' }

/** A rule's severity; books saved before severities existed only have `level`. */
export const severityOf = (rule) => rule.severity || FROM_LEVEL[rule.level] || 'medium'
export const severityLabel = (rule) => SEVERITIES.find((s) => s.value === severityOf(rule))?.label ?? 'Medium'
export const levelOf = (severity) => SEVERITIES.find((s) => s.value === severity)?.level ?? 'standard'

/** Book icons (drawn in RuleIcon.jsx). Values match the Codex's icon names. */
export const BOOK_ICONS = [
  { value: 'Users', label: 'People' },
  { value: 'Scroll', label: 'Scroll' },
  { value: 'BookOpen', label: 'Open book' },
  { value: 'ShieldAlert', label: 'Shield (alert)' },
  { value: 'ShieldCheck', label: 'Shield (check)' },
  { value: 'Gavel', label: 'Gavel' },
  { value: 'Video', label: 'Camera' },
  { value: 'HeartHandshake', label: 'Handshake' },
]
