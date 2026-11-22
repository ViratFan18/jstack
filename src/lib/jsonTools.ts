export type JsonValidation = { valid: true; kind: string } | { valid: false; error: string }

function skipWhitespace(source: string, cursor: { index: number }) {
  while (/[ \t\n\r]/.test(source[cursor.index] ?? '')) cursor.index += 1
}

function readString(source: string, cursor: { index: number }): string {
  const start = cursor.index
  cursor.index += 1
  while (cursor.index < source.length) {
    const character = source[cursor.index]
    cursor.index += 1
    if (character === '\\') cursor.index += 1
    else if (character === '"') break
  }
  return source.slice(start, cursor.index)
}

function transformJson(source: string, pretty: boolean): string {
  JSON.parse(source)
  const cursor = { index: 0 }
  const indent = (depth: number) => pretty ? '  '.repeat(depth) : ''

  const readValue = (depth: number): string => {
    if (depth > 256) throw new Error('JSON nesting is too deep to format safely (maximum 256 levels).')
    skipWhitespace(source, cursor)
    const character = source[cursor.index]
    if (character === '"') return readString(source, cursor)
    if (character !== '{' && character !== '[') {
      const start = cursor.index
      while (cursor.index < source.length && !/[ \t\n\r,[\]{}:]/.test(source[cursor.index])) cursor.index += 1
      return source.slice(start, cursor.index)
    }

    const isObject = character === '{'
    const closing = isObject ? '}' : ']'
    const separator = pretty ? ',\n' : ','
    const colon = pretty ? ': ' : ':'
    cursor.index += 1
    skipWhitespace(source, cursor)
    if (source[cursor.index] === closing) {
      cursor.index += 1
      return isObject ? '{}' : '[]'
    }

    const entries: string[] = []
    while (cursor.index < source.length) {
      skipWhitespace(source, cursor)
      const prefix = isObject ? `${indent(depth + 1)}${readString(source, cursor)}${colon}` : indent(depth + 1)
      if (isObject) {
        skipWhitespace(source, cursor)
        cursor.index += 1
      }
      const value = readValue(depth + 1)
      entries.push(`${prefix}${value}`)
      skipWhitespace(source, cursor)
      if (source[cursor.index] === closing) {
        cursor.index += 1
        break
      }
      cursor.index += 1
    }

    return pretty
      ? `${isObject ? '{' : '['}\n${entries.join(separator)}\n${indent(depth)}${closing}`
      : `${isObject ? '{' : '['}${entries.join(separator)}${closing}`
  }

  return readValue(0)
}

export function formatJson(source: string): string {
  return transformJson(source, true)
}

export function minifyJson(source: string): string {
  return transformJson(source, false)
}

export function validateJson(source: string): JsonValidation {
  try {
    const parsed: unknown = JSON.parse(source)
    const kind = parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed
    return { valid: true, kind }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid JSON.' }
  }
}