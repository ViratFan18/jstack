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
import { JWE_ALGORITHMS, JWS_ALGORITHMS, type JweAlgorithm, type JwsAlgorithm } from './jwt-constants'
import { decodeWellFormedUtf8, encodeWellFormedUtf8 } from './utf8'

function requireWebCrypto(): Crypto {
  if (typeof globalThis.isSecureContext === 'boolean' && !globalThis.isSecureContext) {
    throw new Error('Cryptographic operations require a secure context. Open JStack over HTTPS or use localhost for development.')
  }
  try {
    const webCrypto = globalThis.crypto
    if (webCrypto?.subtle && typeof webCrypto.getRandomValues === 'function') return webCrypto
  } catch {
    throw new Error('Web Crypto is unavailable in this browser context. Use a current browser over HTTPS or localhost.')
  }
  throw new Error('This browser does not provide the Web Crypto API required for signing, encryption, or key generation.')
}

function fromBase64Url(value: string, invalidMessage = 'Invalid Base64URL data.'): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new Error(invalidMessage)
  }
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  if (toBase64Url(bytes) !== value) throw new Error(invalidMessage)
  return bytes
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function isJwsAlgorithm(value: string): value is JwsAlgorithm {
  return JWS_ALGORITHMS.some((algorithm) => algorithm === value)
}

export function decodeJwtToken(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('A signed JWT must contain three dot-separated parts.')
  try {
    const header = JSON.parse(decodeWellFormedUtf8(fromBase64Url(parts[0]))) as Record<string, unknown>
    const payload = JSON.parse(decodeWellFormedUtf8(fromBase64Url(parts[1]))) as Record<string, unknown>
    fromBase64Url(parts[2], 'The JWT signature must use Base64URL characters.')
    if (!header || Array.isArray(header) || typeof header !== 'object') throw new Error('The JWT header must be a JSON object.')
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('The JWT payload must be a JSON object.')
    return { header, payload, signature: parts[2] }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'The JWT contains invalid Base64URL or JSON data.')
  }
}

async function jwsKey(algorithm: JwsAlgorithm, key: string, operation: 'sign' | 'verify'): Promise<CryptoKey | Uint8Array> {
  if (!isJwsAlgorithm(algorithm)) throw new Error(`Unsupported JWS algorithm: ${algorithm}`)
  requireWebCrypto()
  if (algorithm.startsWith('HS')) {
    if (!key) throw new Error('Enter the shared secret for HMAC.')
    const secretBytes = encodeWellFormedUtf8(key)
    const minimumBytes = algorithm === 'HS256' ? 32 : algorithm === 'HS384' ? 48 : 64
    if (secretBytes.byteLength < minimumBytes) {
      throw new Error(`${algorithm} requires a shared secret of at least ${minimumBytes} bytes. Generate or provide a stronger key.`)
    }
    return secretBytes
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

export async function verifyJwt(
  token: string,
  algorithm: JwsAlgorithm,
  keyText: string,
  clockTolerance = 0,
  expectedIssuer = '',
  expectedAudience = '',
) {
  const key = await jwsKey(algorithm, keyText, 'verify')
  return jwtVerify(token.trim(), key, {
    algorithms: [algorithm],
    clockTolerance,
    issuer: expectedIssuer.trim() || undefined,
    audience: expectedAudience.trim() || undefined,
  })
}

export async function encryptJwe(plaintext: string, algorithm: JweAlgorithm, keyText: string): Promise<string> {
  if (!JWE_ALGORITHMS.includes(algorithm)) throw new Error(`Unsupported JWE algorithm: ${algorithm}`)
  requireWebCrypto()
  let key: CryptoKey | Uint8Array
  const [keyManagement, encryption] = algorithm.split('/')
  if (keyManagement === 'dir') {
    if (!keyText.trim()) throw new Error('Enter a 256-bit Base64URL key for direct encryption.')
    key = fromBase64Url(keyText.trim(), 'A256GCM requires a valid Base64URL-encoded 32-byte key.')
    if (key.byteLength !== 32) throw new Error('A256GCM requires a 32-byte key. Generate a key here or provide 32 bytes encoded as Base64URL.')
  } else {
    if (!keyText.trim()) throw new Error('Enter a public key in PEM SPKI format for RSA-OAEP-256.')
    key = await importSPKI(keyText, keyManagement)
  }
  return new CompactEncrypt(encodeWellFormedUtf8(plaintext))
    .setProtectedHeader({ alg: keyManagement, enc: encryption, typ: 'JWT' })
    .encrypt(key)
}

export async function decryptJwe(token: string, algorithm: JweAlgorithm, keyText: string): Promise<{ plaintext: string; header: Record<string, unknown> }> {
  if (!JWE_ALGORITHMS.includes(algorithm)) throw new Error(`Unsupported JWE algorithm: ${algorithm}`)
  requireWebCrypto()
  const [keyManagement] = algorithm.split('/')
  let key: CryptoKey | Uint8Array
  if (keyManagement === 'dir') {
    key = fromBase64Url(keyText.trim(), 'A256GCM requires a valid Base64URL-encoded 32-byte key.')
    if (key.byteLength !== 32) throw new Error('A256GCM requires the same 32-byte Base64URL key used to encrypt this token.')
  } else {
    if (!keyText.trim()) throw new Error('Enter the private key in PEM PKCS#8 format for RSA-OAEP-256.')
    key = await importPKCS8(keyText, keyManagement)
  }
  const result = await compactDecrypt(token.trim(), key, { keyManagementAlgorithms: [keyManagement], contentEncryptionAlgorithms: ['A256GCM'] })
  return { plaintext: decodeWellFormedUtf8(result.plaintext), header: result.protectedHeader }
}

export async function generateJwtKey(algorithm: string): Promise<{ secret?: string; publicKey?: string; privateKey?: string; format: string }> {
  const webCrypto = requireWebCrypto()
  if (algorithm.startsWith('HS')) {
    const hmacKeyLengths: Record<string, number> = { HS256: 32, HS384: 48, HS512: 64 }
    const byteLength = hmacKeyLengths[algorithm]
    if (!byteLength) throw new Error(`Unsupported HMAC algorithm: ${algorithm}`)
    const bytes = webCrypto.getRandomValues(new Uint8Array(byteLength))
    return { secret: toBase64Url(bytes), format: `${byteLength * 8}-bit random HMAC key · Base64URL text used as UTF-8` }
  }
  if (algorithm === 'dir/A256GCM') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(32))
    return { secret: toBase64Url(bytes), format: '32-byte AES key · Base64URL' }
  }
  let keyAlgorithm: JwsAlgorithm | 'RSA-OAEP-256'
  if (algorithm === 'RSA-OAEP-256/A256GCM') keyAlgorithm = 'RSA-OAEP-256'
  else if (isJwsAlgorithm(algorithm)) keyAlgorithm = algorithm
  else throw new Error(`Unsupported key algorithm: ${algorithm}`)
  const { publicKey, privateKey } = await generateKeyPair(keyAlgorithm, {
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