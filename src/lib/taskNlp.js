import * as chrono from 'chrono-node'

const PRIORITY_MAP = { p1: 'high', p2: 'medium', p3: 'low' }

function normalizeLabel(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '-')
}

export function parseTaskInput(raw) {
  let text = raw

  // Extract priority: p1 / p2 / p3 (case-insensitive, word boundary)
  let priority = 'medium'
  text = text.replace(/\b(p[123])\b/gi, (_, token) => {
    priority = PRIORITY_MAP[token.toLowerCase()] ?? 'medium'
    return ''
  })

  // Extract labels: #word or #word-word
  const labels = []
  text = text.replace(/#([\w-]+)/g, (_, label) => {
    labels.push(normalizeLabel(label))
    return ''
  })

  // Extract due date using chrono
  let due_date = null
  const parsed = chrono.parse(text, new Date(), { forwardDate: true })
  if (parsed.length > 0) {
    const result = parsed[0]
    const d = result.start.date()
    due_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    text = text.slice(0, result.index) + text.slice(result.index + result.text.length)
  }

  const title = text.replace(/\s+/g, ' ').trim()

  return { title, priority, labels, due_date }
}

export { normalizeLabel }
