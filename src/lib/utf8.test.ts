import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeWellFormedUtf8, encodeWellFormedUtf8 } from './utf8'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UTF-8 browser API fallbacks', () => {
  it('reports unsupported text encoder and decoder APIs clearly', () => {
    vi.stubGlobal('TextEncoder', undefined)
    expect(() => encodeWellFormedUtf8('hello')).toThrow(/does not support UTF-8 encoding/i)

    vi.stubGlobal('TextDecoder', undefined)
    expect(() => decodeWellFormedUtf8(new Uint8Array([104, 105]))).toThrow(/does not support UTF-8 decoding/i)
  })
})
