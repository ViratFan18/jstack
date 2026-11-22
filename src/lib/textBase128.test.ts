import { describe, expect, it } from 'vitest'
import { decodeBase128Text, encodeTextBase128 } from './textBase128'

describe('JStack Base128 text tools', () => {
  it('round-trips UTF-8 text through printable Braille symbols', () => {
    const text = 'Java tools, café ✓ 🚀'
    const encoded = encodeTextBase128(text)

    expect(Array.from(encoded).every((symbol) => {
      const codePoint = symbol.codePointAt(0) ?? 0
      return codePoint >= 0x2801 && codePoint <= 0x2880
    })).toBe(true)
    expect(decodeBase128Text(encoded)).toBe(text)
  })

  it('round-trips empty text', () => {
    expect(encodeTextBase128('')).toBe('')
    expect(decodeBase128Text('')).toBe('')
    expect(() => encodeTextBase128('\udfff')).toThrow(/unpaired UTF-16 surrogate/i)
  })

  it('rejects unknown alphabets, nonzero padding, and invalid UTF-8', () => {
    expect(() => decodeBase128Text('not Base128')).toThrow(/Braille symbols/i)
    expect(() => decodeBase128Text('\u2842')).toThrow(/too short/i)
    expect(() => decodeBase128Text('\u2880\u2842')).toThrow(/padding/i)
    expect(() => decodeBase128Text('\u2880\u2841')).toThrow(/UTF-8/i)
  })
})
