export function encodeWellFormedUtf8(value: string): Uint8Array {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error('Text contains an unpaired UTF-16 surrogate and cannot be encoded as UTF-8.')
      }
      index += 1
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new Error('Text contains an unpaired UTF-16 surrogate and cannot be encoded as UTF-8.')
    }
  }
  if (typeof TextEncoder === 'undefined') {
    throw new Error('This browser does not support UTF-8 encoding required by this tool.')
  }
  return new TextEncoder().encode(value)
}

export function decodeWellFormedUtf8(value: Uint8Array): string {
  if (typeof TextDecoder === 'undefined') {
    throw new Error('This browser does not support UTF-8 decoding required by this tool.')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(value)
  } catch (error) {
    if (error instanceof TypeError) throw new Error('The input bytes are not valid UTF-8 text.')
    throw error
  }
}
