export function encodeTextBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export function decodeBase64Text(value: string): string {
  const input = value.trim()
  if (!input || !/^[A-Za-z0-9+/]*={0,2}$/.test(input)) {
    throw new Error('Enter standard Base64 using letters, numbers, +, /, and optional = padding.')
  }
  const unpadded = input.replace(/=+$/, '')
  if (unpadded.length % 4 === 1 || (input.includes('=') && input.length % 4 !== 0)) {
    throw new Error('The Base64 padding or length is invalid.')
  }
  const padded = unpadded + '='.repeat((4 - unpadded.length % 4) % 4)
  try {
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (encodeTextBase64(decoded).replace(/=+$/, '') !== unpadded) {
      throw new Error('The Base64 value is not canonically encoded.')
    }
    return decoded
  } catch (error) {
    if (error instanceof Error && error.message.includes('canonically')) throw error
    throw new Error('Invalid Base64 data. Check the padding and UTF-8 content.')
  }
}