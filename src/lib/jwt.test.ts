import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeJwtToken, decryptJwe, encryptJwe, generateJwtKey, signJwt, toBase64Url, verifyJwt } from './jwt'

const header = '{"typ":"JWT"}'
const payload = '{"sub":"java-dev","role":"engineer"}'
const hmacSecret = 'local-test-secret-0123456789-32bytes!'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JWT and JWE operations', () => {
  it('explains when crypto operations are blocked in an insecure context', async () => {
    vi.stubGlobal('isSecureContext', false)
    await expect(generateJwtKey('HS256')).rejects.toThrow(/secure context.*HTTPS.*localhost/i)
  })

  it('explains when the Web Crypto API is unavailable', async () => {
    vi.stubGlobal('crypto', undefined)
    await expect(generateJwtKey('HS256')).rejects.toThrow(/does not provide the Web Crypto API/i)
  })

  it('decodes compact JWT parts without claiming signature verification', async () => {
    const token = await signJwt(header, payload, 'HS256', hmacSecret)
    const decoded = decodeJwtToken(token)
    expect(decoded.header.alg).toBe('HS256')
    expect(decoded.payload.sub).toBe('java-dev')
    expect(decoded.signature).not.toBe('')
  })

  it('rejects malformed Base64URL in compact token parts', async () => {
    const token = await signJwt(header, payload, 'HS256', hmacSecret)
    const parts = token.split('.')
    parts[2] = `${parts[2]}%`
    expect(() => decodeJwtToken(parts.join('.'))).toThrow(/Base64URL/i)
  })

  it('signs and verifies an HMAC token and rejects the wrong secret', async () => {
    const token = await signJwt(header, payload, 'HS256', hmacSecret)
    const verified = await verifyJwt(token, 'HS256', hmacSecret)
    expect(verified.payload.role).toBe('engineer')
    await expect(verifyJwt(token, 'HS256', 'not-the-same-secret-0123456789')).rejects.toThrow()
  })

  it('requires at least the hash output length for HMAC signing keys', async () => {
    await expect(signJwt(header, payload, 'HS256', 'too-short')).rejects.toThrow(/at least 32 bytes/)
    await expect(signJwt(header, payload, 'HS384', 'x'.repeat(47))).rejects.toThrow(/at least 48 bytes/)
    await expect(signJwt(header, payload, 'HS512', 'x'.repeat(63))).rejects.toThrow(/at least 64 bytes/)
  })

  it('rejects ill-formed Unicode key and encryption input instead of replacing code units', async () => {
    await expect(signJwt(header, payload, 'HS256', `${hmacSecret}\ud800`)).rejects.toThrow(/unpaired UTF-16 surrogate/i)
    await expect(encryptJwe('\ud800', 'dir/A256GCM', toBase64Url(new Uint8Array(32)))).rejects.toThrow(/unpaired UTF-16 surrogate/i)
  })

  it.each([
    ['HS256', 32],
    ['HS384', 48],
    ['HS512', 64],
  ] as const)('generates a compatible %s key', async (algorithm, expectedBytes) => {
    const generated = await generateJwtKey(algorithm)
    const secret = generated.secret
    expect(secret).toBeDefined()
    if (!secret) throw new Error('Expected generated HMAC key material.')
    const base64 = secret.replace(/-/g, '+').replace(/_/g, '/')
    expect(atob(base64 + '='.repeat((4 - base64.length % 4) % 4))).toHaveLength(expectedBytes)
    const token = await signJwt(header, payload, algorithm, secret)
    await expect(verifyJwt(token, algorithm, secret)).resolves.toBeDefined()
  })

  it('validates expected issuer and audience claims', async () => {
    const claims = JSON.stringify({ sub: 'java-dev', iss: 'https://issuer.example', aud: 'java-api' })
    const token = await signJwt(header, claims, 'HS256', hmacSecret)
    const verified = await verifyJwt(token, 'HS256', hmacSecret, 0, 'https://issuer.example', 'java-api')
    expect(verified.payload.iss).toBe('https://issuer.example')
    await expect(verifyJwt(token, 'HS256', hmacSecret, 0, 'https://wrong.example', 'java-api')).rejects.toThrow()
    await expect(verifyJwt(token, 'HS256', hmacSecret, 0, 'https://issuer.example', 'other-api')).rejects.toThrow()
  })

  it('generates and uses an asymmetric RSA signing key pair', async () => {
    const keys = await generateJwtKey('RS256')
    const token = await signJwt(header, payload, 'RS256', keys.privateKey || '')
    const verified = await verifyJwt(token, 'RS256', keys.publicKey || '')
    expect(verified.payload.sub).toBe('java-dev')
  })

  it.each(['RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'] as const)(
    'signs and verifies with %s',
    async (algorithm) => {
      const keys = await generateJwtKey(algorithm)
      const token = await signJwt(header, payload, algorithm, keys.privateKey || '')
      const verified = await verifyJwt(token, algorithm, keys.publicKey || '')
      expect(verified.payload.sub).toBe('java-dev')
    },
  )

  it('round-trips an authenticated direct-encryption JWE', async () => {
    const key = toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
    const encrypted = await encryptJwe(payload, 'dir/A256GCM', key)
    expect(encrypted.split('.')).toHaveLength(5)
    const decrypted = await decryptJwe(encrypted, 'dir/A256GCM', key)
    expect(JSON.parse(decrypted.plaintext).sub).toBe('java-dev')
  })

  it('round-trips RSA-OAEP-256/A256GCM with a generated key pair', async () => {
    const keys = await generateJwtKey('RSA-OAEP-256/A256GCM')
    const encrypted = await encryptJwe(payload, 'RSA-OAEP-256/A256GCM', keys.publicKey || '')
    const decrypted = await decryptJwe(encrypted, 'RSA-OAEP-256/A256GCM', keys.privateKey || '')
    expect(JSON.parse(decrypted.plaintext).sub).toBe('java-dev')
  })

  it('rejects malformed tokens and invalid direct-encryption key sizes', async () => {
    expect(() => decodeJwtToken('not.a.jwt.with.too.many.parts')).toThrow(/three/)
    await expect(encryptJwe(payload, 'dir/A256GCM', 'short')).rejects.toThrow(/32-byte/)
    await expect(generateJwtKey('none')).rejects.toThrow(/Unsupported key algorithm/)
  })
})