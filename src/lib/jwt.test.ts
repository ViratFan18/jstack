import { describe, expect, it } from 'vitest'
import { decodeJwtToken, decryptJwe, encryptJwe, generateJwtKey, signJwt, toBase64Url, verifyJwt } from './jwt'

const header = '{"typ":"JWT"}'
const payload = '{"sub":"java-dev","role":"engineer"}'

describe('JWT and JWE operations', () => {
  it('decodes compact JWT parts without claiming signature verification', async () => {
    const token = await signJwt(header, payload, 'HS256', 'local-test-secret-0123456789')
    const decoded = decodeJwtToken(token)
    expect(decoded.header.alg).toBe('HS256')
    expect(decoded.payload.sub).toBe('java-dev')
    expect(decoded.signature).not.toBe('')
  })

  it('signs and verifies an HMAC token and rejects the wrong secret', async () => {
    const token = await signJwt(header, payload, 'HS256', 'local-test-secret-0123456789')
    const verified = await verifyJwt(token, 'HS256', 'local-test-secret-0123456789')
    expect(verified.payload.role).toBe('engineer')
    await expect(verifyJwt(token, 'HS256', 'not-the-same-secret-0123456789')).rejects.toThrow()
  })

  it('generates and uses an asymmetric RSA signing key pair', async () => {
    const keys = await generateJwtKey('RS256')
    const token = await signJwt(header, payload, 'RS256', keys.privateKey || '')
    const verified = await verifyJwt(token, 'RS256', keys.publicKey || '')
    expect(verified.payload.sub).toBe('java-dev')
  })

  it('round-trips an authenticated direct-encryption JWE', async () => {
    const key = toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
    const encrypted = await encryptJwe(payload, 'dir/A256GCM', key)
    expect(encrypted.split('.')).toHaveLength(5)
    const decrypted = await decryptJwe(encrypted, 'dir/A256GCM', key)
    expect(JSON.parse(decrypted.plaintext).sub).toBe('java-dev')
  })

  it('rejects malformed tokens and invalid direct-encryption key sizes', async () => {
    expect(() => decodeJwtToken('not.a.jwt.with.too.many.parts')).toThrow(/three/)
    await expect(encryptJwe(payload, 'dir/A256GCM', 'short')).rejects.toThrow(/32-byte/)
  })
})