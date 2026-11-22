import { describe, expect, it } from 'vitest'
import { formatJson, minifyJson, validateJson } from './jsonTools'

describe('JSON tools', () => {
  it('formats valid JSON with readable indentation', () => {
    expect(formatJson('{"name":"Ada","active":true}')).toBe(`{
  "name": "Ada",
  "active": true
}`)
  })

  it('minifies valid JSON', () => {
    expect(minifyJson('{ "name": "Ada", "active": true }')).toBe('{"name":"Ada","active":true}')
  })

  it('preserves numeric precision, exponent notation, and escaped strings', () => {
    const source = '{ "large": 9007199254740993, "infinite": 1e400, "decimal": 1.2300, "text": "a \\"b\\"" }'
    expect(minifyJson(source)).toBe('{"large":9007199254740993,"infinite":1e400,"decimal":1.2300,"text":"a \\"b\\""}')
    expect(formatJson(source)).toBe(`{
  "large": 9007199254740993,
  "infinite": 1e400,
  "decimal": 1.2300,
  "text": "a \\"b\\""
}`)
  })

  it('validates objects, arrays, and primitive JSON values', () => {
    expect(validateJson('{"ok":true}')).toEqual({ valid: true, kind: 'object' })
    expect(validateJson('[1,2]')).toEqual({ valid: true, kind: 'array' })
    expect(validateJson('null')).toEqual({ valid: true, kind: 'null' })
  })

  it('reports invalid JSON without throwing', () => {
    const result = validateJson('{bad}')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toBeTruthy()
  })

  it('format and minify reject malformed JSON', () => {
    expect(() => formatJson('{bad}')).toThrow()
    expect(() => minifyJson('{bad}')).toThrow()
  })

  it('guards extreme nesting while keeping syntax validation separate', () => {
    const deeplyNested = `${'['.repeat(257)}0${']'.repeat(257)}`
    expect(validateJson(deeplyNested).valid).toBe(true)
    expect(() => formatJson(deeplyNested)).toThrow(/maximum 256 levels/i)
  })
})