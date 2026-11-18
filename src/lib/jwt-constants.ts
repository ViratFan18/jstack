export const JWS_ALGORITHMS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'] as const
export const JWE_ALGORITHMS = ['RSA-OAEP-256/A256GCM', 'dir/A256GCM'] as const
export type JwsAlgorithm = typeof JWS_ALGORITHMS[number]
export type JweAlgorithm = typeof JWE_ALGORITHMS[number]