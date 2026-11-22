import { decodeWellFormedUtf8, encodeWellFormedUtf8 } from './utf8'

const BRAILLE_BASE = 0x2801
const BRAILLE_MAX = 0x2880

export function encodeTextBase128(value: string): string {
  const bytes = encodeWellFormedUtf8(value)
  const output: string[] = []
  let buffer = 0
  let bits = 0

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 7) {
      bits -= 7
      output.push(String.fromCodePoint(BRAILLE_BASE + ((buffer >> bits) & 0x7f)))
      buffer &= (1 << bits) - 1
    }
  }

  if (bits > 0) output.push(String.fromCodePoint(BRAILLE_BASE + ((buffer << (7 - bits)) & 0x7f)))
  return output.join('')
}

export function decodeBase128Text(value: string): string {
  const input = value.trim()
  const symbols = Array.from(input)
  const bytes: number[] = []
  let buffer = 0
  let bits = 0

  for (const symbol of symbols) {
    const codePoint = symbol.codePointAt(0)
    if (codePoint === undefined || codePoint < BRAILLE_BASE || codePoint > BRAILLE_MAX) {
      throw new Error('Enter JStack Base128 text using Braille symbols from the matching encoder.')
    }

    buffer = (buffer << 7) | (codePoint - BRAILLE_BASE)
    bits += 7
    while (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
      buffer &= (1 << bits) - 1
    }
  }

  if (symbols.length > 0 && bytes.length === 0) throw new Error('The Base128 input is too short to contain UTF-8 data.')
  if (bits > 0 && buffer !== 0) throw new Error('The Base128 padding is invalid.')

  const decoded = decodeWellFormedUtf8(Uint8Array.from(bytes))

  if (encodeTextBase128(decoded) !== input) throw new Error('The Base128 input is not canonically encoded.')
  return decoded
}
