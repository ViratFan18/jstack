export type JsonValidation = { valid: true; kind: string } | { valid: false; error: string }

export function formatJson(source: string): string {
  return JSON.stringify(JSON.parse(source), null, 2)
}

export function minifyJson(source: string): string {
  return JSON.stringify(JSON.parse(source))
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