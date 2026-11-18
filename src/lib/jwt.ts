import {
  CompactEncrypt,
  compactDecrypt,
  decodeProtectedHeader,
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from 'jose'
import type { JweAlgorithm, JwsAlgorithm } from './jwt-constants'

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new Error('A256GCM requires a valid Base64URL-encoded 32-byte key.')
  }
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function decodeJwtToken(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('A signed JWT must contain three dot-separated parts.')
  try {
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as Record<string, unknown>
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1]))) as Record<string, unknown>
    if (!header || Array.isArray(header) || typeof header !== 'object') throw new Error('The JWT header must be a JSON object.')
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('The JWT payload must be a JSON object.')
    return { header, payload, signature: parts[2] }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'The JWT contains invalid Base64URL or JSON data.')
  }
}

async function jwsKey(algorithm: JwsAlgorithm, key: string, operation: 'sign' | 'verify'): Promise<CryptoKey | Uint8Array> {
  if (algorithm.startsWith('HS')) {
    if (!key) throw new Error('Enter the shared secret for HMAC.')
    return new TextEncoder().encode(key)
  }
  if (!key.trim()) throw new Error(`Enter the ${operation === 'sign' ? 'private' : 'public'} key in PEM PKCS#8/SPKI format.`)
  return operation === 'sign' ? importPKCS8(key, algorithm) : importSPKI(key, algorithm)
}

export async function signJwt(headerText: string, payloadText: string, algorithm: JwsAlgorithm, keyText: string): Promise<string> {
  const header = JSON.parse(headerText) as Record<string, unknown>
  const payload = JSON.parse(payloadText) as Record<string, unknown>
  if (!header || Array.isArray(header) || typeof header !== 'object') throw new Error('JWT header must be a JSON object.')
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('JWT payload must be a JSON object.')
  const key = await jwsKey(algorithm, keyText, 'sign')
  const { alg: _ignored, ...safeHeader } = header
  return new SignJWT(payload).setProtectedHeader({ ...safeHeader, alg: algorithm, typ: 'JWT' }).sign(key)
}

export async function verifyJwt(token: string, algorithm: JwsAlgorithm, keyText: string, clockTolerance = 0) {
  const key = await jwsKey(algorithm, keyText, 'verify')
  return jwtVerify(token.trim(), key, { algorithms: [algorithm], clockTolerance })
}

export async function encryptJwe(plaintext: string, algorithm: JweAlgorithm, keyText: string): Promise<string> {
  let key: CryptoKey | Uint8Array
  const [keyManagement, encryption] = algorithm.split('/')
  if (keyManagement === 'dir') {
    if (!keyText.trim()) throw new Error('Enter a 256-bit Base64URL key for direct encryption.')
    key = fromBase64Url(keyText.trim())
    if (key.byteLength !== 32) throw new Error('A256GCM requires a 32-byte key. Generate a key here or provide 32 bytes encoded as Base64URL.')
  } else {
    if (!keyText.trim()) throw new Error('Enter a public key in PEM SPKI format for RSA-OAEP-256.')
    key = await importSPKI(keyText, keyManagement)
  }
  return new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: keyManagement, enc: encryption, typ: 'JWT' })
    .encrypt(key)
}

export async function decryptJwe(token: string, algorithm: JweAlgorithm, keyText: string): Promise<{ plaintext: string; header: Record<string, unknown> }> {
  const [keyManagement] = algorithm.split('/')
  let key: CryptoKey | Uint8Array
  if (keyManagement === 'dir') {
    key = fromBase64Url(keyText.trim())
    if (key.byteLength !== 32) throw new Error('A256GCM requires the same 32-byte Base64URL key used to encrypt this token.')
  } else {
    if (!keyText.trim()) throw new Error('Enter the private key in PEM PKCS#8 format for RSA-OAEP-256.')
    key = await importPKCS8(keyText, keyManagement)
  }
  const result = await compactDecrypt(token.trim(), key, { keyManagementAlgorithms: [keyManagement], contentEncryptionAlgorithms: ['A256GCM'] })
  return { plaintext: new TextDecoder().decode(result.plaintext), header: result.protectedHeader }
}

export async function generateJwtKey(algorithm: string): Promise<{ secret?: string; publicKey?: string; privateKey?: string; format: string }> {
  if (algorithm.startsWith('HS') || algorithm === 'dir/A256GCM') {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    return { secret: toBase64Url(bytes), format: '32-byte key · Base64URL' }
  }
  const keyAlgorithm = algorithm.includes('/') ? 'RSA-OAEP-256' : algorithm
  const { publicKey, privateKey } = await generateKeyPair(keyAlgorithm as JwsAlgorithm | 'RSA-OAEP-256', {
    modulusLength: keyAlgorithm.startsWith('RSA') ? 2048 : undefined,
    extractable: true,
  })
  return {
    publicKey: await exportSPKI(publicKey),
    privateKey: await exportPKCS8(privateKey),
    format: keyAlgorithm.startsWith('RSA') ? 'RSA 2048 · PEM SPKI / PKCS#8' : `${keyAlgorithm} · PEM SPKI / PKCS#8`,
  }
}

export function readProtectedHeader(token: string): Record<string, unknown> {
  return decodeProtectedHeader(token.trim())
}