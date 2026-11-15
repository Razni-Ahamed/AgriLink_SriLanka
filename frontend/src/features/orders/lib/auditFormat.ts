/** One line of an audit entry's "what changed": a field (when the record names one), before, after. */
export interface AuditChange {
  field: string | null
  from: string | null
  to: string | null
}

interface BooleanLabels {
  yes: string
  no: string
}

/**
 * "RegistrationApproved" → "Registration approved", "phoneNumber" → "Phone number". The audit log
 * stores the code's own names for actions, records and fields; this makes them read as words.
 * They stay in English: they are not in the translation files (see the note in AuditLogTable).
 */
export function sentenceCase(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // An acronym followed by a word: "AIAdvisory" → "AI Advisory".
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    // Acronyms ("AI", "NIC") keep their capitals; other words go lower case.
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()))
    .join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A long generated file name, shortened to something a person can still tell apart. */
function shortFileName(url: string): string {
  const name = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? url
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  return stem.length > 12 ? `${stem.slice(0, 8)}…${extension}` : name
}

function display(value: unknown, labels: BooleanLabels): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'boolean') {
    return value ? labels.yes : labels.no
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  const text = String(value)
  // .NET writes booleans as "True" / "False".
  if (text === 'True' || text === 'true') {
    return labels.yes
  }
  if (text === 'False' || text === 'false') {
    return labels.no
  }
  // A stored photo's address is a long generated name; the file name is enough to tell two apart.
  if (/^https?:\/\//i.test(text)) {
    return shortFileName(text)
  }
  return text
}

/** `{"phoneNumber":"071…"}` → `{ phoneNumber: '071…' }`; anything that isn't a JSON object → null. */
function asRecord(value: string | null): Record<string, unknown> | null {
  if (!value || !value.trim().startsWith('{')) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/**
 * Turns an audit entry's stored before and after into lines a person can read. A pair of JSON
 * objects becomes one line per field ("Phone number: 071… → 077…"); anything else is one line.
 * Returns no lines when nothing was recorded on either side.
 */
export function describeChange(
  oldValue: string | null,
  newValue: string | null,
  labels: BooleanLabels,
): AuditChange[] {
  const before = asRecord(oldValue)
  const after = asRecord(newValue)

  if (before || after) {
    const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
    return fields.map((field) => ({
      field: sentenceCase(field),
      // One side may be plain text while the other is an object; show the plain side as it is.
      from: before ? display(before[field], labels) : display(oldValue, labels),
      to: after ? display(after[field], labels) : display(newValue, labels),
    }))
  }

  const from = display(oldValue, labels)
  const to = display(newValue, labels)
  return from === null && to === null ? [] : [{ field: null, from, to }]
}
