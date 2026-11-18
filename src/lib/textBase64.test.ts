import { describe, expect, it } from 'vitest'
import { decodeBase64Text, encodeTextBase64 } from './textBase64'

describe('Base64 text tools', () => {
  it('encodes and decodes plain UTF-8 text', () => {
    const text = 'Java tools, café ✓'
    const encoded = encodeTextBase64(text)
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(decodeBase64Text(encoded)).toBe(text)
  })

  it('decodes standard Base64 without optional padding', () => {
    expect(decodeBase64Text('SGVsbG8')).toBe('Hello')
  })

  it('rejects Base64URL characters and malformed padding', () => {
    expect(() => decodeBase64Text('SGVsbG8_')).toThrow(/standard Base64/i)
    expect(() => decodeBase64Text('A===')).toThrow(/standard Base64/i)
    expect(() => decodeBase64Text('YR==')).toThrow(/canonically encoded/i)
  })
})