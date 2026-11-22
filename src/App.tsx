import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ArrowLeftRight, ArrowUpDown, Binary, BookOpenText, Braces, Check, ChevronDown, CircleHelp,
  Code2, Copy, Download, FileKey2, KeyRound, LockKeyhole, Menu, Moon, Clock3, Star, Plus,
  RotateCcw, Search, ShieldCheck, Sun, TerminalSquare, WandSparkles, X,
} from 'lucide-react'
import { JWE_ALGORITHMS, JWS_ALGORITHMS } from './lib/jwt-constants'
import { JStackLogo } from './JStackLogo'
import { generateJavaModel, type JavaModelStyle } from './lib/javaModel'
import { decodeBase128Text, encodeTextBase128 } from './lib/textBase128'
import './App.css'
import './design-system.css'

type Section = 'jwt' | 'json' | 'java' | 'base64' | 'about'
type JwtMode = 'Decode' | 'Encode & sign' | 'Verify' | 'Encrypt' | 'Decrypt' | 'Keys'
type JsonMode = 'format' | 'minify' | 'validate'
type Base64Mode = 'encode' | 'decode'
type EncodingFormat = 'base64' | 'base128'
type Notice = { tone: 'success' | 'warning' | 'error'; title: string; detail: string }
type PreferenceKey = 'favorites' | 'recent' | 'theme'
type ToolRoute = {
  section: Section
  title: string
  description: string
  heading: string
  jwtMode?: JwtMode
  jsonMode?: JsonMode
  base64Mode?: Base64Mode
  base128Mode?: Base64Mode
  encodingFormat?: EncodingFormat
}
type CommandItem = { id: string; title: string; description: string; group: string; slug?: string; href?: string }

const jwtModes: JwtMode[] = ['Encode & sign', 'Verify', 'Decode', 'Encrypt', 'Decrypt', 'Keys']
const MAX_TOOL_INPUT_LENGTH = 500_000
const MAX_JAVA_INPUT_LENGTH = 200_000
const MAX_STORED_TOOL_LIST_LENGTH = 4_096
const TOOL_MODULE_TIMEOUT_MS = 15_000
const CRYPTO_OPERATION_TIMEOUT_MS = 30_000
const CLIPBOARD_TIMEOUT_MS = 5_000
const TOOL_MODULE_TIMEOUT_MESSAGE = 'The local tool code did not load within 15 seconds. Check your connection and retry; your input remains in the editor.'
const CRYPTO_TIMEOUT_MESSAGE = 'The browser cryptographic operation did not finish within 30 seconds. No result was accepted; retry or use a supported browser.'
const CLIPBOARD_TIMEOUT_MESSAGE = 'Clipboard access did not finish within 5 seconds. Select and copy the output manually.'
const initialJwtHeader = '{\n  "typ": "JWT"\n}'
const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqYXZhLWRldiIsInJvbGUiOiJlbmdpbmVlciIsImlhdCI6MTcwNDA2NzIwMH0.c2FtcGxlLXNpZ25hdHVyZQ'
const samplePayloadText = '{\n  "sub": "java-dev",\n  "role": "engineer",\n  "iat": 1704067200\n}'
const initialConverterInput = '{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "address": {\n    "city": "London",\n    "postalCode": "N1"\n  },\n  "roles": ["admin", "author"]\n}'
const jwtClaimShortcuts = [
  { key: 'exp', label: 'Expiration', meaning: 'Sets when the token expires', example: 'In 1 hour', accessibleExample: 'one hour from now' },
  { key: 'nbf', label: 'Valid from', meaning: 'Sets when the token can first be used', example: 'Now', accessibleExample: 'now' },
  { key: 'iss', label: 'Issuer', meaning: 'Identifies who issued the token', example: 'https://issuer.example', accessibleExample: 'https://issuer.example' },
  { key: 'aud', label: 'Audience', meaning: 'Identifies the service this token is for', example: 'java-api', accessibleExample: 'java-api' },
] as const
type JwtClaimKey = typeof jwtClaimShortcuts[number]['key']
const sampleJavaInput = '{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "address": {\n    "city": "London",\n    "postalCode": "N1"\n  },\n  "roles": ["admin", "author"],\n  "nickname": null\n}'
const toolRoutes: Record<string, ToolRoute> = {
  'jwt-decoder': {
    section: 'jwt', jwtMode: 'Decode', heading: 'JWT decoder',
    title: 'JWT Decoder Online – Inspect Token Header and Claims | JStack',
    description: 'Decode a compact JWT in your browser to inspect its header, payload, and signature. Decoding does not verify a token.',
  },
  'jwt-encoder': {
    section: 'jwt', jwtMode: 'Encode & sign', heading: 'JWT encoder and signer',
    title: 'JWT Encoder Online – Create and Sign JWS Tokens | JStack',
    description: 'Create and sign a JSON Web Token in your browser with supported JWS algorithms. Your payload and signing key stay local.',
  },
  'jwt-verifier': {
    section: 'jwt', jwtMode: 'Verify', heading: 'JWT signature verifier',
    title: 'JWT Signature Verifier Online – Verify JWS Locally | JStack',
    description: 'Verify a JWT signature and registered claims in your browser using a selected algorithm and key. Verification is not authorization.',
  },
  'jwe-encryptor': {
    section: 'jwt', jwtMode: 'Encrypt', heading: 'JWE encryptor',
    title: 'JWE Encryptor Online – Encrypt a JSON Payload | JStack',
    description: 'Encrypt a JSON payload as a JWE in your browser with supported RSA-OAEP-256 or direct A256GCM key management.',
  },
  'jwe-decryptor': {
    section: 'jwt', jwtMode: 'Decrypt', heading: 'JWE decryptor',
    title: 'JWE Decryptor Online – Decrypt a Compact JWE | JStack',
    description: 'Decrypt a compact JWE locally in your browser with a matching key. Your encrypted token and key are not uploaded.',
  },
  'jwt-key-generator': {
    section: 'jwt', jwtMode: 'Keys', heading: 'JWT key generator',
    title: 'JWT Key Generator Online – Generate Key Material Locally | JStack',
    description: 'Generate supported HMAC, RSA, ECDSA, or AES-GCM JWT key material with Web Crypto in your browser.',
  },
  'json-formatter': {
    section: 'json', jsonMode: 'format', heading: 'JSON formatter',
    title: 'JSON Formatter Online – Format JSON in Your Browser | JStack',
    description: 'Format and indent JSON locally in your browser. The JStack JSON tool also supports minifying and checking JSON syntax.',
  },
  'json-minifier': {
    section: 'json', jsonMode: 'minify', heading: 'JSON minifier',
    title: 'JSON Minifier Online – Minify JSON Locally | JStack',
    description: 'Remove unnecessary whitespace from valid JSON in your browser while preserving its data. No JSON is uploaded.',
  },
  'json-validator': {
    section: 'json', jsonMode: 'validate', heading: 'JSON syntax validator',
    title: 'JSON Validator Online – Check JSON Syntax | JStack',
    description: 'Check whether text is syntactically valid JSON in your browser. This tool does not validate schemas or application rules.',
  },
  'json-to-java': {
    section: 'java', heading: 'JSON to Java model generator',
    title: 'JSON to Java Records and POJOs – Local Generator | JStack',
    description: 'Generate Java records or POJOs from JSON locally in your browser, including nested objects and arrays.',
  },
  'base64-converter': {
    section: 'base64', heading: 'Base64 text encoder and decoder',
    title: 'Base64 Encoder and Decoder Online – UTF-8 Text | JStack',
    description: 'Encode UTF-8 text as standard Base64 or decode Base64 back to text locally in your browser. Base64 is not encryption.',
  },
  'base128-converter': {
    section: 'base64', encodingFormat: 'base128', base128Mode: 'encode', heading: 'JStack Base128 encoder and decoder',
    title: 'JStack Base128 Converter – Custom UTF-8 Text Encoding',
    description: 'Encode and decode UTF-8 text with JStack’s custom printable Base128 format. It is not a universal Base128 standard.',
  },
}
const toolDisplayNames: Record<string, string> = {
  'jwt-decoder': 'JWT decoder',
  'jwt-encoder': 'JWT encoder and signer',
  'jwt-verifier': 'JWT signature verifier',
  'jwe-encryptor': 'JWE encryptor',
  'jwe-decryptor': 'JWE decryptor',
  'jwt-key-generator': 'JWT key generator',
  'json-formatter': 'JSON formatter',
  'json-minifier': 'JSON minifier',
  'json-validator': 'JSON syntax validator',
  'json-to-java': 'JSON to Java models',
  'base64-converter': 'Base64 text converter',
  'base128-converter': 'JStack Base128 converter',
}
const sitePages = [
  { title: 'Home', description: 'Explore JStack tools and practical guides', href: '/' },
  { title: 'Learning Center', description: 'Hands-on tutorials for Java and backend developers', href: '/learning' },
  { title: 'Developer articles', description: 'Practical tutorials on JWT, Java models, and encodings', href: '/blog' },
  { title: 'JWT verification article', description: 'Separate decoding, verification, claims, and authorization', href: '/blog/jwt-signature-verification' },
  { title: 'JSON to Java article', description: 'Infer and review Java models from representative JSON', href: '/blog/json-to-java-records' },
  { title: 'Text encoding article', description: 'Compare Base64, Base64URL, and JStack Base128', href: '/blog/base64-vs-base128' },
  { title: 'Developer guide', description: 'JWT, JWE, Java, JSON, and encoding guidance', href: '/guide' },
  { title: 'Changelog', description: 'Undated summary of documented project capabilities', href: '/changelog' },
  { title: 'About JStack', description: 'What the tools do and how they work', href: '/about' },
  { title: 'Contact', description: 'Available support contact methods', href: '/contact' },
  { title: 'Feedback', description: 'Prepare a feedback email on your device', href: '/feedback' },
  { title: 'Privacy Policy', description: 'Browser data, local storage, and hosting notes', href: '/privacy' },
  { title: 'Terms of Use', description: 'Plain-language tool usage terms', href: '/terms' },
  { title: 'Disclaimer', description: 'Limitations and independent review guidance', href: '/disclaimer' },
]

function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}

function requireLoadedModule<T extends object>(module: T | null | undefined): T {
  if (!module || typeof module !== 'object') {
    throw new Error('The local tool code could not be loaded. Check your connection and retry. If the page was open during a deployment, reload to load the current assets.')
  }
  return module
}

function getOperationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .* failed|chunkloaderror|unable to preload|failed to load module script/i.test(message)) {
    return 'The local tool code could not be loaded. Check your connection and retry. If the page was open during a deployment, reload to load the current assets. Your input is still here.'
  }
  return message || 'The operation could not be completed. Check the input and browser support, then retry.'
}
type HomeTool = {
  slug: string
  category: 'JWT & JWE' | 'JSON' | 'JAVA' | 'ENCODING'
  title: string
  description: string
  badge?: string
}

const homeTools: HomeTool[] = [
  { slug: 'jwt-decoder', category: 'JWT & JWE', title: 'JWT decoder', description: 'Inspect token header, payload and signature.', badge: 'JWT' },
  { slug: 'jwt-encoder', category: 'JWT & JWE', title: 'JWT encoder and signer', description: 'Create a signed JWT with your selected key.', badge: 'JWS' },
  { slug: 'jwt-verifier', category: 'JWT & JWE', title: 'JWT signature verifier', description: 'Check signature, issuer and audience claims.', badge: 'JWS' },
  { slug: 'jwe-encryptor', category: 'JWT & JWE', title: 'JWE encryptor', description: 'Encrypt JSON into a compact JWE.', badge: 'JWE' },
  { slug: 'jwe-decryptor', category: 'JWT & JWE', title: 'JWE decryptor', description: 'Decrypt a compact JWE with its key.', badge: 'JWE' },
  { slug: 'jwt-key-generator', category: 'JWT & JWE', title: 'JWT key generator', description: 'Generate signing or encryption key material.' },
  { slug: 'json-formatter', category: 'JSON', title: 'JSON formatter', description: 'Indent JSON to make it easier to read.' },
  { slug: 'json-minifier', category: 'JSON', title: 'JSON minifier', description: 'Remove whitespace without changing JSON values.' },
  { slug: 'json-validator', category: 'JSON', title: 'JSON validator', description: 'Check JSON syntax, not schemas.' },
  { slug: 'json-to-java', category: 'JAVA', title: 'JSON to Java generator', description: 'Generate Java 16+ records or POJOs from JSON.', badge: 'JAVA' },
  { slug: 'base64-converter', category: 'ENCODING', title: 'Base64 encoder and decoder', description: 'Encode or decode UTF-8 text.' },
  { slug: 'base128-converter', category: 'ENCODING', title: 'JStack Base128 converter', description: 'Use JStack’s custom UTF-8 text encoding.' },
]

const homeGuides = [
  {
    label: 'JWT SECURITY',
    title: 'JWT decoding is not signature verification',
    description: 'Understand signatures, claims, and authorization in a JWT flow.',
    href: '/blog/jwt-signature-verification',
  },
  {
    label: 'JAVA MODELS',
    title: 'Turn JSON examples into Java models',
    description: 'Review records, POJOs, nulls, arrays, and inferred types.',
    href: '/blog/json-to-java-records',
  },
  {
    label: 'TEXT ENCODING',
    title: 'Base64, Base64URL, and JStack Base128',
    description: 'Compare text encodings and learn why they are not encryption.',
    href: '/blog/base64-vs-base128',
  },
]

function getRequestedTool() {
  const appRoute = window.location.pathname.match(/^\/app\/([^/]+)\/?$/)
  if (!appRoute) return new URLSearchParams(window.location.search).get('tool')
  try {
    return decodeURIComponent(appRoute[1])
  } catch {
    return null
  }
}

function getToolRoute(slug: string | null): ToolRoute | undefined {
  return slug && Object.prototype.hasOwnProperty.call(toolRoutes, slug) ? toolRoutes[slug] : undefined
}

function updateMeta(attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = value
}

const readLocalList = (key: string) => {
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored || stored.length > MAX_STORED_TOOL_LIST_LENGTH) return []
    const value = JSON.parse(stored)
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(getToolRoute(item))))].slice(0, 6)
      : []
  } catch {
    return []
  }
}

const writeLocalList = (key: string, value: string[]) => {
  try {
    const serialized = JSON.stringify([...new Set(value)].slice(0, 6))
    if (window.localStorage.getItem(key) === serialized) return true
    window.localStorage.setItem(key, serialized)
    return true
  } catch {
    return false
  }
}

function App() {
  const requestedTool = getRequestedTool()
  const initialRoute = getToolRoute(requestedTool)
  const [section, setSection] = useState<Section>(initialRoute?.section ?? 'jwt')
  const [jwtMode, setJwtMode] = useState<JwtMode>(initialRoute?.jwtMode ?? 'Encode & sign')
  const [jsonMode, setJsonMode] = useState<JsonMode>(initialRoute?.jsonMode ?? 'format')
  const [base64Mode, setBase64Mode] = useState<Base64Mode>(initialRoute?.base64Mode ?? 'encode')
  const [base128Mode, setBase128Mode] = useState<Base64Mode>(initialRoute?.base128Mode ?? 'encode')
  const [encodingFormat, setEncodingFormat] = useState<EncodingFormat>(initialRoute?.encodingFormat ?? 'base64')
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem('jstack-theme-v2') !== 'light'
    } catch {
      return true
    }
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [token, setToken] = useState('')
  const [header, setHeader] = useState(initialJwtHeader)
  const [payload, setPayload] = useState('{\n  "sub": "java-dev",\n  "role": "engineer",\n  "iat": 1704067200\n}')
  const [algorithm, setAlgorithm] = useState<string>(
    initialRoute?.jwtMode === 'Encrypt' || initialRoute?.jwtMode === 'Decrypt' ? 'dir/A256GCM' : 'HS256',
  )
  const [secret, setSecret] = useState('')
  const [tolerance, setTolerance] = useState('0')
  const [expectedIssuer, setExpectedIssuer] = useState('')
  const [expectedAudience, setExpectedAudience] = useState('')
  const [jwtResult, setJwtResult] = useState('')
  const [decoded, setDecoded] = useState<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [converterInput, setConverterInput] = useState(initialConverterInput)
  const [converterOutput, setConverterOutput] = useState('')
  const [converterError, setConverterError] = useState('')
  const [converterHasRun, setConverterHasRun] = useState(false)
  const [converterBusy, setConverterBusy] = useState(false)
  const [javaInput, setJavaInput] = useState(sampleJavaInput)
  const [javaOutput, setJavaOutput] = useState('')
  const [javaError, setJavaError] = useState('')
  const [javaHasRun, setJavaHasRun] = useState(false)
  const [javaClassName, setJavaClassName] = useState('User')
  const [javaStyle, setJavaStyle] = useState<JavaModelStyle>('record')
  const [base64Input, setBase64Input] = useState('Java developers, welcome!')
  const [base64Output, setBase64Output] = useState('')
  const [base64Error, setBase64Error] = useState('')
  const [base64HasRun, setBase64HasRun] = useState(false)
  const [base64Busy, setBase64Busy] = useState(false)
  const [base128Input, setBase128Input] = useState('Java developers, welcome!')
  const [base128Output, setBase128Output] = useState('')
  const [base128Error, setBase128Error] = useState('')
  const [base128HasRun, setBase128HasRun] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [preferenceIssues, setPreferenceIssues] = useState<Record<PreferenceKey, string>>({ favorites: '', recent: '', theme: '' })
  const [advancedJwtOpen, setAdvancedJwtOpen] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)
  const [favoriteTools, setFavoriteTools] = useState<string[]>(() => readLocalList('jstack-favorites'))
  const [recentTools, setRecentTools] = useState<string[]>(() => {
    const saved = readLocalList('jstack-recent')
    return requestedTool && getToolRoute(requestedTool)
      ? [requestedTool, ...saved.filter((item) => item !== requestedTool)].slice(0, 6)
      : saved
  })
  const operationSequence = useRef(0)
  const mountedRef = useRef(false)
  const copiedTimeoutRef = useRef<number | null>(null)
  const unsavedInputRef = useRef(false)
  const commandPanelRef = useRef<HTMLElement | null>(null)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const jweMode = jwtMode === 'Encrypt' || jwtMode === 'Decrypt'
  const isHomepage = section === 'jwt' && !requestedTool
  const setPreferenceIssue = (key: PreferenceKey, message: string) => {
    setPreferenceIssues((current) => ({ ...current, [key]: message }))
  }
  const invalidatePendingOperation = () => {
    operationSequence.current += 1
    setBusy(false)
    setConverterBusy(false)
    setBase64Busy(false)
    setActionMessage('')
  }
  const clearJwtOutput = () => {
    setJwtResult('')
    setDecoded(null)
    setNotice(null)
  }
  const clearToolResult = (route: ToolRoute) => {
    if (route.section === 'jwt') clearJwtOutput()
    if (route.section === 'json') {
      setConverterOutput('')
      setConverterError('')
      setConverterHasRun(false)
    }
    if (route.section === 'java') {
      setJavaOutput('')
      setJavaError('')
      setJavaHasRun(false)
    }
    if (route.section === 'base64') {
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
      setBase128Output('')
      setBase128Error('')
      setBase128HasRun(false)
    }
  }
  const alignAlgorithmWithRoute = (route: ToolRoute) => {
    if (route.jwtMode === 'Encrypt' || route.jwtMode === 'Decrypt') {
      setAlgorithm((current) => JWE_ALGORITHMS.some((item) => item === current) ? current : 'dir/A256GCM')
    } else if (route.jwtMode === 'Encode & sign' || route.jwtMode === 'Verify') {
      setAlgorithm((current) => JWS_ALGORITHMS.some((item) => item === current) ? current : 'HS256')
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      operationSequence.current += 1
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
    }
  }, [])
  useEffect(() => {
    unsavedInputRef.current = Boolean(token || secret || expectedIssuer || expectedAudience)
      || header !== initialJwtHeader
      || payload !== samplePayloadText
      || converterInput !== initialConverterInput
      || javaInput !== sampleJavaInput
      || javaClassName !== 'User'
      || base64Input !== 'Java developers, welcome!'
      || base128Input !== 'Java developers, welcome!'
      || tolerance !== '0'
  }, [token, secret, expectedIssuer, expectedAudience, header, payload, converterInput, javaInput, javaClassName, base64Input, base128Input, tolerance])
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.content = darkMode ? '#0B1015' : '#F4F8FA'
  }, [darkMode])
  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])
  useEffect(() => {
    const syncStoredPreferences = (event: StorageEvent) => {
      if (event.key === null || event.key === 'jstack-favorites') {
        const next = readLocalList('jstack-favorites')
        setFavoriteTools((current) => current.length === next.length && current.every((item, index) => item === next[index]) ? current : next)
      }
      if (event.key === null || event.key === 'jstack-recent') {
        const next = readLocalList('jstack-recent')
        setRecentTools((current) => current.length === next.length && current.every((item, index) => item === next[index]) ? current : next)
      }
      if (event.key === null || event.key === 'jstack-theme-v2') {
        try {
          setDarkMode(window.localStorage.getItem('jstack-theme-v2') !== 'light')
        } catch {
          setDarkMode(true)
        }
      }
    }
    window.addEventListener('storage', syncStoredPreferences)
    return () => window.removeEventListener('storage', syncStoredPreferences)
  }, [])
  useEffect(() => {
    const openCommandPalette = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
      if (event.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', openCommandPalette)
    return () => window.removeEventListener('keydown', openCommandPalette)
  }, [])
  useEffect(() => {
    if (!commandOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = commandPanelRef.current
    const input = panel?.querySelector<HTMLInputElement>('input')
    input?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCommandOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      previouslyFocused?.focus()
    }
  }, [commandOpen])
  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsavedInputRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [])
  useEffect(() => {
    const activeRoute = requestedTool ? toolRoutes[requestedTool] : undefined
    const routeMatchesState = activeRoute?.section === section
      && (activeRoute.jwtMode === undefined || activeRoute.jwtMode === jwtMode)
      && (activeRoute.jsonMode === undefined || activeRoute.jsonMode === jsonMode)
      && (activeRoute.base64Mode === undefined || activeRoute.base64Mode === base64Mode)
      && (activeRoute.base128Mode === undefined || activeRoute.base128Mode === base128Mode)
      && (activeRoute.encodingFormat === undefined || activeRoute.encodingFormat === encodingFormat)
    const route = routeMatchesState ? activeRoute : undefined
    const isHome = section === 'jwt' && !requestedTool
    const jwtRoute = Object.values(toolRoutes).find((item) => item.section === 'jwt' && item.jwtMode === jwtMode) ?? toolRoutes['jwt-decoder']
    const jsonRoute = Object.values(toolRoutes).find((item) => item.section === 'json' && item.jsonMode === jsonMode) ?? toolRoutes['json-formatter']
    const javaRoute = toolRoutes['json-to-java']
    const pageTitle = route?.title ?? (isHome
      ? 'Free Online Java Developer Tools for JWT, JSON & Base64 | JStack'
      : section === 'jwt' ? jwtRoute.title
        : section === 'json' ? jsonRoute.title
        : section === 'base64' ? (encodingFormat === 'base128' ? toolRoutes['base128-converter'].title : toolRoutes['base64-converter'].title)
          : section === 'java' ? javaRoute.title
          : 'About JStack · Browser-Based Developer Tools')
    const pageDescription = route?.description ?? (isHome
      ? 'Use free online JWT, JSON, Java, and Base64 developer tools. Decode or sign tokens, format JSON, generate Java models, and convert text.'
      : section === 'jwt' ? jwtRoute.description
        : section === 'json' ? jsonRoute.description
        : section === 'base64' ? (encodingFormat === 'base128' ? toolRoutes['base128-converter'].description : toolRoutes['base64-converter'].description)
          : section === 'java' ? javaRoute.description
          : 'Learn about JStack browser-based JWT, JSON-to-Java, Base64, and JStack Base128 developer tools.')
    document.title = pageTitle
    updateMeta('name', 'description', pageDescription)
    updateMeta('property', 'og:title', pageTitle)
    updateMeta('property', 'og:description', pageDescription)
    updateMeta('name', 'twitter:title', pageTitle)
    updateMeta('name', 'twitter:description', pageDescription)
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    const canonicalPath = route && requestedTool
      ? `/${requestedTool}`
      : isHome
        ? '/'
        : section === 'java'
          ? '/json-to-java'
          : section === 'base64'
            ? encodingFormat === 'base128' ? '/base128-converter' : '/base64-converter'
            : section === 'json'
              ? `/json-${jsonMode === 'format' ? 'formatter' : jsonMode === 'minify' ? 'minifier' : 'validator'}`
              : section === 'jwt'
                ? jwtMode === 'Encode & sign' ? '/jwt-encoder'
                  : jwtMode === 'Verify' ? '/jwt-verifier'
                    : jwtMode === 'Encrypt' ? '/jwe-encryptor'
                      : jwtMode === 'Decrypt' ? '/jwe-decryptor'
                        : jwtMode === 'Keys' ? '/jwt-key-generator'
                          : '/jwt-decoder'
                : section === 'about' ? '/about' : '/'
    canonical.href = new URL(canonicalPath, window.location.origin).href
    updateMeta('property', 'og:url', canonical.href)
  }, [section, jwtMode, jsonMode, base64Mode, base128Mode, encodingFormat, requestedTool])

  useEffect(() => {
    const restoreToolRoute = () => {
      const tool = getRequestedTool()
      const route = getToolRoute(tool)
      if (!tool || !route) {
        invalidatePendingOperation()
        clearJwtOutput()
        setSection('jwt')
        setJwtMode('Encode & sign')
        return
      }
      invalidatePendingOperation()
      setSection(route.section)
      if (route.jwtMode) setJwtMode(route.jwtMode)
      alignAlgorithmWithRoute(route)
      if (route.jsonMode) setJsonMode(route.jsonMode)
      if (route.base64Mode) setBase64Mode(route.base64Mode)
      if (route.base128Mode) setBase128Mode(route.base128Mode)
      if (route.encodingFormat) setEncodingFormat(route.encodingFormat)
      clearToolResult(route)
      setRecentTools((current) => [tool, ...current.filter((item) => item !== tool)].slice(0, 6))
    }
    window.addEventListener('popstate', restoreToolRoute)
    return () => window.removeEventListener('popstate', restoreToolRoute)
  }, [])
  useEffect(() => {
    if (recentTools.length && !writeLocalList('jstack-recent', recentTools)) {
      setPreferenceIssue('recent', 'Recent-tool history is available in this tab but could not be saved; browser storage may be blocked or full.')
    } else setPreferenceIssue('recent', '')
  }, [recentTools])

  const openTool = (slug: string) => {
    const route = getToolRoute(slug)
    if (!route) return
    invalidatePendingOperation()
    clearToolResult(route)
    setToolSearch('')
    setSection(route.section)
    if (route.jwtMode) setJwtMode(route.jwtMode)
    alignAlgorithmWithRoute(route)
    if (route.jsonMode) setJsonMode(route.jsonMode)
    if (route.base64Mode) setBase64Mode(route.base64Mode)
    if (route.base128Mode) setBase128Mode(route.base128Mode)
    if (route.encodingFormat) setEncodingFormat(route.encodingFormat)
    setSidebarOpen(false)
    const url = `/app/${slug}`
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.pushState({}, '', url)
    setRecentTools((current) => {
      const nextRecent = [slug, ...current.filter((item) => item !== slug)].slice(0, 6)
      return nextRecent
    })
  }

  const navigate = (next: Section) => {
    const routeKey = next === 'java'
      ? 'json-to-java'
      : next === 'base64'
        ? encodingFormat === 'base128' ? 'base128-converter' : 'base64-converter'
        : next === 'json'
          ? jsonMode === 'minify' ? 'json-minifier' : jsonMode === 'validate' ? 'json-validator' : 'json-formatter'
          : next === 'about'
            ? null
            : Object.keys(toolRoutes).find((slug) => toolRoutes[slug].jwtMode === jwtMode) ?? 'jwt-encoder'
    if (routeKey) openTool(routeKey)
    else window.location.assign('/about')
  }
  const goHome = () => {
    invalidatePendingOperation()
    clearJwtOutput()
    setSection('jwt')
    setJwtMode('Encode & sign')
    setSidebarOpen(false)
    if (window.location.pathname !== '/' || window.location.search) window.history.pushState({}, '', '/')
  }
  const toolSearchTerms = toolSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matchingTools = toolSearchTerms.length
    ? Object.entries(toolRoutes).filter(([slug, route]) => {
      const searchableText = `${toolDisplayNames[slug]} ${route.heading} ${route.description} ${slug}`.toLowerCase()
      return toolSearchTerms.every((term) => searchableText.includes(term))
    })
    : []
  const moveTabSelection = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    values: readonly string[],
    current: string,
    select: (value: string) => void,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = values.indexOf(current)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? values.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + values.length) % values.length
    select(values[nextIndex])
    const tabList = event.currentTarget.closest('[role="tablist"]')
    tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }
  const runJwt = async () => {
    const operation = ++operationSequence.current
    const inputs = [token, header, payload, secret, expectedIssuer, expectedAudience]
    if (inputs.some((value) => value.length > MAX_TOOL_INPUT_LENGTH)) {
      setBusy(false)
      setJwtResult('')
      setDecoded(null)
      setNotice({ tone: 'error', title: 'Input too large', detail: 'Keep each JWT tool input below 500,000 characters.' })
      return
    }
    const clockTolerance = Number(tolerance)
    if (jwtMode === 'Verify' && (!Number.isFinite(clockTolerance) || clockTolerance < 0 || clockTolerance > 300)) {
      setBusy(false)
      setJwtResult('')
      setDecoded(null)
      setNotice({ tone: 'error', title: 'Invalid clock tolerance', detail: 'Choose a value between 0 and 300 seconds.' })
      return
    }
    setBusy(true); setNotice(null); setDecoded(null); setJwtResult('')
    try {
      const { decodeJwtToken, decryptJwe, encryptJwe, signJwt, verifyJwt } = await runWithTimeout(
        import('./lib/jwt').then(requireLoadedModule),
        TOOL_MODULE_TIMEOUT_MS,
        TOOL_MODULE_TIMEOUT_MESSAGE,
      )
      if (operation !== operationSequence.current) return
      if (jwtMode === 'Decode') {
        if (token.trim().split('.').length === 5) throw new Error('This is a five-part JWE. Choose Decrypt to inspect it after successful decryption.')
        setDecoded(decodeJwtToken(token))
        setNotice({ tone: 'warning', title: 'Decoded, not verified', detail: 'This only reads token contents. It does not establish that the signature or claims are trustworthy.' })
      } else if (jwtMode === 'Encode & sign') {
        const result = await runWithTimeout(
          signJwt(header, payload, algorithm as typeof JWS_ALGORITHMS[number], secret),
          CRYPTO_OPERATION_TIMEOUT_MS,
          CRYPTO_TIMEOUT_MESSAGE,
        )
        if (operation !== operationSequence.current) return
        setJwtResult(result)
        setNotice({ tone: 'success', title: 'JWT signed', detail: `Signed locally using ${algorithm}. Keep your signing key private.` })
      } else if (jwtMode === 'Verify') {
        const verified = await runWithTimeout(
          verifyJwt(
            token,
            algorithm as typeof JWS_ALGORITHMS[number],
            secret,
            Number(tolerance) || 0,
            expectedIssuer,
            expectedAudience,
          ),
          CRYPTO_OPERATION_TIMEOUT_MS,
          CRYPTO_TIMEOUT_MESSAGE,
        )
        if (operation !== operationSequence.current) return
        setDecoded({ header: verified.protectedHeader, payload: verified.payload, signature: token.split('.')[2] || '' })
        setNotice({ tone: 'success', title: 'Signature and registered claims verified', detail: `Verified locally with ${algorithm}. This does not replace authorization checks.` })
      } else if (jwtMode === 'Encrypt') {
        const result = await runWithTimeout(
          encryptJwe(payload, algorithm as typeof JWE_ALGORITHMS[number], secret),
          CRYPTO_OPERATION_TIMEOUT_MS,
          CRYPTO_TIMEOUT_MESSAGE,
        )
        if (operation !== operationSequence.current) return
        setJwtResult(result)
        setNotice({ tone: 'success', title: 'JWE encrypted', detail: `Encrypted locally using ${algorithm}. Keep the decryption key private.` })
      } else if (jwtMode === 'Decrypt') {
        const result = await runWithTimeout(
          decryptJwe(token, algorithm as typeof JWE_ALGORITHMS[number], secret),
          CRYPTO_OPERATION_TIMEOUT_MS,
          CRYPTO_TIMEOUT_MESSAGE,
        )
        if (operation !== operationSequence.current) return
        setJwtResult(result.plaintext)
        setNotice({ tone: 'success', title: 'JWE decrypted', detail: `Decrypted locally using ${algorithm}. Header: ${JSON.stringify(result.header)}` })
      }
    } catch (error) {
      if (operation === operationSequence.current) {
        setNotice({ tone: 'error', title: 'Operation failed', detail: getOperationErrorMessage(error) })
      }
    } finally {
      if (operation === operationSequence.current) setBusy(false)
    }
  }

  const generateKey = async (requestedAlgorithm = algorithm): Promise<boolean> => {
    const operation = ++operationSequence.current
    setBusy(true)
    try {
      const { generateJwtKey } = await runWithTimeout(import('./lib/jwt').then(requireLoadedModule), TOOL_MODULE_TIMEOUT_MS, TOOL_MODULE_TIMEOUT_MESSAGE)
      const generated = await runWithTimeout(
        generateJwtKey(requestedAlgorithm),
        CRYPTO_OPERATION_TIMEOUT_MS,
        CRYPTO_TIMEOUT_MESSAGE,
      )
      if (operation !== operationSequence.current) return false
      if (generated.secret) setSecret(generated.secret)
      else setSecret(jwtMode === 'Verify' || jwtMode === 'Encrypt' ? generated.publicKey || '' : generated.privateKey || '')
      setJwtResult(generated.secret || `PUBLIC KEY\n${generated.publicKey}\n\nPRIVATE KEY\n${generated.privateKey}`)
      setNotice({ tone: 'success', title: 'Key generated locally', detail: `${generated.format}. Private material is not saved.` })
      return true
    } catch (error) {
      if (operation === operationSequence.current) {
        setNotice({ tone: 'error', title: 'Key generation failed', detail: getOperationErrorMessage(error) })
      }
      return false
    } finally {
      if (operation === operationSequence.current) setBusy(false)
    }
  }

  const runConverter = async () => {
    const operation = ++operationSequence.current
    setConverterBusy(true)
    setConverterHasRun(false)
    if (converterInput.length > MAX_TOOL_INPUT_LENGTH) {
      setConverterOutput('')
      setConverterError('Input is too large. Keep JSON below 500,000 characters.')
      setConverterBusy(false)
      return
    }
    setConverterError('')
    try {
      const converterTools = await runWithTimeout(
        import('./lib/jsonTools').then(requireLoadedModule),
        TOOL_MODULE_TIMEOUT_MS,
        TOOL_MODULE_TIMEOUT_MESSAGE,
      )
      if (jsonMode === 'validate') {
        const result = converterTools.validateJson(converterInput)
        if (!result.valid) throw new Error(result.error)
        if (operation !== operationSequence.current) return
        setConverterOutput(`Valid JSON · ${result.kind}`)
        setConverterHasRun(true)
      } else {
        const result = jsonMode === 'format' ? converterTools.formatJson(converterInput) : converterTools.minifyJson(converterInput)
        if (operation !== operationSequence.current) return
        setConverterOutput(result)
        setConverterHasRun(true)
      }
    } catch (error) {
      if (operation === operationSequence.current) {
        setConverterOutput('')
        setConverterHasRun(false)
        setConverterError(getOperationErrorMessage(error))
      }
    } finally {
      if (operation === operationSequence.current) setConverterBusy(false)
    }
  }

  const runJavaModel = () => {
    setJavaHasRun(false)
    if (javaInput.length > MAX_JAVA_INPUT_LENGTH) {
      setJavaError('Input is too large. Keep JSON below 200,000 characters.')
      setJavaOutput('')
      return
    }
    setJavaError('')
    try {
      setJavaOutput(generateJavaModel(javaInput, { className: javaClassName, style: javaStyle }))
      setJavaHasRun(true)
    } catch (error) {
      setJavaOutput('')
      setJavaHasRun(false)
      setJavaError(error instanceof Error ? error.message : 'Could not generate a Java model.')
    }
  }

  const runBase64 = async () => {
    const operation = ++operationSequence.current
    setBase64Busy(true)
    setBase64HasRun(false)
    if (base64Input.length > MAX_TOOL_INPUT_LENGTH) {
      setBase64Output('')
      setBase64Error('Input is too large. Keep text below 500,000 characters.')
      setBase64Busy(false)
      return
    }
    setBase64Error('')
    try {
      const base64Tools = await runWithTimeout(
        import('./lib/textBase64').then(requireLoadedModule),
        TOOL_MODULE_TIMEOUT_MS,
        TOOL_MODULE_TIMEOUT_MESSAGE,
      )
      const result = base64Mode === 'encode'
        ? base64Tools.encodeTextBase64(base64Input)
        : base64Tools.decodeBase64Text(base64Input)
      if (operation === operationSequence.current) {
        setBase64Output(result)
        setBase64HasRun(true)
      }
    } catch (error) {
      if (operation === operationSequence.current) {
        setBase64Output('')
        setBase64HasRun(false)
        setBase64Error(getOperationErrorMessage(error))
      }
    } finally {
      if (operation === operationSequence.current) setBase64Busy(false)
    }
  }

  const runBase128 = () => {
    setBase128HasRun(false)
    if (base128Input.length > MAX_TOOL_INPUT_LENGTH) {
      setBase128Error('Input is too large. Keep text below 500,000 characters.')
      setBase128Output('')
      return
    }
    setBase128Error('')
    try {
      setBase128Output(base128Mode === 'encode' ? encodeTextBase128(base128Input) : decodeBase128Text(base128Input))
      setBase128HasRun(true)
    } catch (error) {
      setBase128Output('')
      setBase128HasRun(false)
      setBase128Error(error instanceof Error ? error.message : 'Could not process this Base128 input.')
    }
  }

  const copyText = async (value: string) => {
    if (!value) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
      await runWithTimeout(navigator.clipboard.writeText(value), CLIPBOARD_TIMEOUT_MS, CLIPBOARD_TIMEOUT_MESSAGE)
      if (!mountedRef.current) return
      setCopied(true)
      setActionMessage('Copied to clipboard.')
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current) setCopied(false)
      }, 1400)
    } catch (error) {
      if (mountedRef.current) {
        setCopied(false)
        setActionMessage(error instanceof Error ? getOperationErrorMessage(error) : 'Clipboard access was blocked. Select and copy the output manually.')
      }
    }
  }

  const downloadText = (value: string, filename: string) => {
    if (!value) return
    try {
      const cleanedFilename = Array.from(filename, (character) => {
        const code = character.charCodeAt(0)
        return code < 32 || code === 127 || '<>:"/\\|?*'.includes(character) ? '_' : character
      }).join('').replace(/^\.+/, '')
      const safeFilename = Array.from(cleanedFilename).slice(0, 100).join('') || 'jstack-output.txt'
      const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = safeFilename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setActionMessage(safeFilename === 'key-material.txt'
        ? 'Key material download started. The file may contain private secrets; keep it secure.'
        : `Download started: ${safeFilename}.`)
    } catch {
      setActionMessage('The download could not be started. Copy the output instead.')
    }
  }

  const loadExample = async () => {
    invalidatePendingOperation()
    if (section === 'jwt') {
      setNotice(null)
      setJwtResult('')
      setDecoded(null)
      if (jwtMode === 'Decode') {
        setToken(sampleJwt)
        return
      }
      if (jwtMode === 'Encode & sign') {
        setHeader('{\n  "typ": "JWT"\n}')
        setPayload(samplePayloadText)
        if (!secret) await generateKey()
        return
      }
      if (jwtMode === 'Keys') {
        await generateKey()
        return
      }
      if (jwtMode === 'Encrypt') {
        setAlgorithm('dir/A256GCM')
        setPayload(samplePayloadText)
        if (await generateKey('dir/A256GCM')) setJwtResult('')
        return
      }

      const operation = ++operationSequence.current
      setBusy(true)
      try {
        const { encryptJwe, generateJwtKey, signJwt } = await runWithTimeout(
          import('./lib/jwt').then(requireLoadedModule),
          TOOL_MODULE_TIMEOUT_MS,
          TOOL_MODULE_TIMEOUT_MESSAGE,
        )
        if (jwtMode === 'Verify') {
          const generated = await runWithTimeout(generateJwtKey('HS256'), CRYPTO_OPERATION_TIMEOUT_MS, CRYPTO_TIMEOUT_MESSAGE)
          if (!generated.secret) throw new Error('Could not generate an HMAC example key.')
          const exampleToken = await runWithTimeout(
            signJwt('{"typ":"JWT"}', samplePayloadText, 'HS256', generated.secret),
            CRYPTO_OPERATION_TIMEOUT_MS,
            CRYPTO_TIMEOUT_MESSAGE,
          )
          if (operation !== operationSequence.current) return
          setAlgorithm('HS256')
          setExpectedIssuer('')
          setExpectedAudience('')
          setSecret(generated.secret)
          setToken(exampleToken)
          setNotice({ tone: 'success', title: 'Example ready', detail: 'A matching token and random HMAC key were generated in this tab. Click Verify token to test them.' })
        } else {
          const generated = await runWithTimeout(generateJwtKey('dir/A256GCM'), CRYPTO_OPERATION_TIMEOUT_MS, CRYPTO_TIMEOUT_MESSAGE)
          if (!generated.secret) throw new Error('Could not generate an A256GCM example key.')
          const encrypted = await runWithTimeout(
            encryptJwe(samplePayloadText, 'dir/A256GCM', generated.secret),
            CRYPTO_OPERATION_TIMEOUT_MS,
            CRYPTO_TIMEOUT_MESSAGE,
          )
          if (operation !== operationSequence.current) return
          setAlgorithm('dir/A256GCM')
          setSecret(generated.secret)
          setToken(encrypted)
          setNotice({ tone: 'success', title: 'Example ready', detail: 'A matching encrypted sample and random key were generated in this tab. Click Decrypt token to test them.' })
        }
      } catch (error) {
        if (operation === operationSequence.current) {
          setNotice({ tone: 'error', title: 'Could not load example', detail: getOperationErrorMessage(error) })
        }
      } finally {
        if (operation === operationSequence.current) setBusy(false)
      }
      return
    }
    if (section === 'java') {
      setJavaInput(sampleJavaInput)
      setJavaOutput('')
      setJavaError('')
      setJavaHasRun(false)
      return
    }
    if (section === 'base64') {
      if (encodingFormat === 'base128') {
        const example = 'JStack ✓'
        setBase128Input(base128Mode === 'encode' ? example : encodeTextBase128(example))
        setBase128Output('')
        setBase128Error('')
        setBase128HasRun(false)
        return
      }
      setBase64Input(base64Mode === 'encode' ? 'Java developers, welcome!' : 'SGVsbG8gV29ybGQh')
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
      return
    }
    setConverterInput('{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "roles": ["admin", "author"]\n}')
    setConverterOutput('')
    setConverterError('')
    setConverterHasRun(false)
  }

  const encodingMode = encodingFormat === 'base64' ? base64Mode : base128Mode
  const encodingInput = encodingFormat === 'base64' ? base64Input : base128Input
  const encodingOutput = encodingFormat === 'base64' ? base64Output : base128Output
  const encodingError = encodingFormat === 'base64' ? base64Error : base128Error
  const encodingHasRun = encodingFormat === 'base64' ? base64HasRun : base128HasRun
  const encodingBusy = encodingFormat === 'base64' && base64Busy
  const setEncodingInput = (value: string) => {
    if (encodingFormat === 'base64') {
      setBase64Input(value)
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
    } else {
      setBase128Input(value)
      setBase128Output('')
      setBase128Error('')
      setBase128HasRun(false)
    }
  }
  const setEncodingMode = (mode: Base64Mode) => {
    invalidatePendingOperation()
    if (encodingFormat === 'base64') {
      setBase64Mode(mode)
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
    } else {
      setBase128Mode(mode)
      setBase128Output('')
      setBase128Error('')
      setBase128HasRun(false)
    }
  }
  const clearEncoding = () => {
    invalidatePendingOperation()
    setEncodingInput('')
    if (encodingFormat === 'base64') {
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
    } else {
      setBase128Output('')
      setBase128Error('')
      setBase128HasRun(false)
    }
  }
  const resetEncodingOutput = () => {
    if (encodingFormat === 'base64') {
      setBase64Output('')
      setBase64Error('')
      setBase64HasRun(false)
    } else {
      setBase128Output('')
      setBase128Error('')
      setBase128HasRun(false)
    }
  }
  const runEncoding = () => {
    if (encodingFormat === 'base64') void runBase64()
    else runBase128()
  }
  const toggleFavorite = (slug: string) => {
    const removing = favoriteTools.includes(slug)
    const next = removing
      ? favoriteTools.filter((item) => item !== slug)
      : [slug, ...favoriteTools].slice(0, 6)
    setFavoriteTools(next)
    const saved = writeLocalList('jstack-favorites', next)
    const toolName = toolDisplayNames[slug] || 'Tool'
    setPreferenceIssue('favorites', saved ? '' : 'Favorites changed in this tab, but browser storage is blocked or full so the change may not persist.')
    setActionMessage(saved
      ? `${toolName} ${removing ? 'removed from' : 'saved to'} favorites.`
      : `${toolName} updated in this tab.`)
  }
  const toggleTheme = () => {
    const nextTheme = darkMode ? 'light' : 'dark'
    setDarkMode(nextTheme === 'dark')
    try {
      window.localStorage.setItem('jstack-theme-v2', nextTheme)
      setPreferenceIssue('theme', '')
    } catch {
      setPreferenceIssue('theme', 'Theme changed for this tab, but browser storage is blocked or full so it may not persist.')
    }
  }
  const clearRecentTools = () => {
    setRecentTools([])
    const saved = writeLocalList('jstack-recent', [])
    setPreferenceIssue('recent', saved ? '' : 'Recent-tool history cleared in this tab, but browser storage is blocked or full so it may reappear.')
    setActionMessage('Recent-tool history cleared.')
  }
  const clearFavoriteTools = () => {
    setFavoriteTools([])
    const saved = writeLocalList('jstack-favorites', [])
    setPreferenceIssue('favorites', saved ? '' : 'Favorites cleared in this tab, but browser storage is blocked or full so they may reappear.')
    setActionMessage('Favorites cleared.')
  }
  const commandCatalog: CommandItem[] = [
    ...favoriteTools.map((slug) => ({ id: `favorite-${slug}`, title: toolDisplayNames[slug], description: 'Open your saved tool', group: 'Favorites', slug })),
    ...recentTools.map((slug) => ({ id: `recent-${slug}`, title: toolDisplayNames[slug], description: 'Open a recently used tool', group: 'Recent', slug })),
    ...Object.entries(toolRoutes).map(([slug, route]) => ({
      id: `tool-${slug}`,
      title: toolDisplayNames[slug],
      description: route.description,
      group: 'Tools',
      slug,
    })),
    ...sitePages.map((item) => ({ id: `page-${item.href}`, ...item, group: 'Pages' })),
  ]
  const commandResults = commandCatalog
    .filter((item, index, entries) => entries.findIndex((candidate) => candidate.slug === item.slug && item.slug || candidate.href === item.href && item.href) === index)
    .filter((item) => `${item.title} ${item.description} ${item.group}`.toLowerCase().includes(commandSearch.trim().toLowerCase()))
  const runCommand = (item: CommandItem) => {
    setCommandOpen(false)
    setCommandSearch('')
    if (item.slug) openTool(item.slug)
    else if (item.href) window.location.assign(item.href)
  }
  const addRegisteredClaim = (claim: JwtClaimKey) => {
    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(payload)
    } catch {
      setNotice({ tone: 'error', title: 'Invalid payload JSON', detail: 'Fix the payload before adding a claim.' })
      return
    }

    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
      setNotice({ tone: 'error', title: 'Payload must be an object', detail: 'JWT claims can only be added to a JSON object.' })
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const values: Record<JwtClaimKey, number | string> = {
      exp: now + 3600,
      nbf: now,
      iss: 'https://issuer.example',
      aud: 'java-api',
    }
    const updatedPayload = Object.assign(parsedPayload, { [claim]: values[claim] })
    setPayload(JSON.stringify(updatedPayload, null, 2))
    clearJwtOutput()
  }

  const jwtExport = jwtResult || (decoded ? JSON.stringify(decoded, null, 2) : '')
  const jwtExportName = jwtMode === 'Keys' ? 'key-material.txt' : decoded ? 'jwt-inspection.json' : 'jwt-output.txt'

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} title={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={19} /></button>
      <button className="brand brand-logo" onClick={goHome} aria-label="JStack home"><JStackLogo compact={false} /></button>
      <nav className="topbar-nav" aria-label="Site navigation">
        <details className="tool-dropdown resource-dropdown">
          <summary>Resources <ChevronDown size={14} /></summary>
          <div className="tool-dropdown-menu">
            <a href="/learning"><BookOpenText size={15} /> Learning Center</a>
            <a href="/guide"><BookOpenText size={15} /> Developer guide</a>
            <a href="/changelog"><WandSparkles size={15} /> Changelog</a>
            <a href="/privacy"><LockKeyhole size={15} /> Privacy</a>
            <a href="/terms"><CircleHelp size={15} /> Terms</a>
          </div>
        </details>
        <a href="/about">About</a>
        <a href="/feedback">Feedback</a>
      </nav>
      <div className="topbar-actions">
        <button className="icon-button command-button" onClick={() => { setCommandSearch(''); setCommandIndex(0); setCommandOpen(true) }} aria-label="Search tools and pages" title="Search tools and pages (Ctrl+K)"><Search size={17} /></button>
        <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`} title={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </header>
    {commandOpen && <div className="command-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false) }}>
      <section ref={commandPanelRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Search JStack tools">
        <div className="command-search"><Search size={18} /><input autoFocus value={commandSearch} onChange={(event) => { setCommandSearch(event.target.value); setCommandIndex(0) }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (commandResults.length) setCommandIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + commandResults.length) % commandResults.length)
          } else if (event.key === 'Enter' && commandResults[commandIndex]) {
            event.preventDefault()
            runCommand(commandResults[commandIndex])
          }
        }} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-activedescendant={commandResults[commandIndex] ? `command-result-${commandIndex}` : undefined} placeholder="Search every tool and page..." aria-label="Search JStack tools and pages" aria-controls="command-results" /><button onClick={() => setCommandOpen(false)} aria-label="Close search"><X size={16} /></button></div>
        <div className="command-results" id="command-results" role="listbox" aria-label="Search results">
          {commandResults.map((item, index) =>
            <button id={`command-result-${index}`} role="option" aria-selected={commandIndex === index} className={commandIndex === index ? 'command-result-active' : ''} key={item.id} onMouseEnter={() => setCommandIndex(index)} onClick={() => runCommand(item)}>
              <span className={`command-icon command-icon-${item.group.toLowerCase()}`}><TerminalSquare size={16} /></span><span><b>{item.title}</b><small>{item.description}</small></span><span className="command-enter">{item.group}</span>
            </button>
          )}
          {commandResults.length === 0 && <p className="command-no-results">No matching tools or pages. Try a different search.</p>}
        </div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> open <kbd>Esc</kbd> close</span><span>Search tools, favorites, recent items, and pages</span></div>
      </section>
    </div>}
    <div className="app-body">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline"><span className="sidebar-workspace-label">TOOLS</span></div>
        <nav aria-label="Main navigation">
          <label className="nav-tool-search"><Search size={15} /><span className="sr-only">Filter tools</span><input value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} placeholder="Filter tools..." /></label>
          {toolSearchTerms.length > 0 ? <>
            <p className="nav-caption">SEARCH RESULTS</p>
            {matchingTools.length > 0
              ? matchingTools.map(([slug]) => <button key={slug} className="nav-item" onClick={() => openTool(slug)}><span className="nav-icon"><TerminalSquare size={16} /></span><span className="nav-item-copy"><b>{toolDisplayNames[slug]}</b></span></button>)
              : <p className="nav-search-empty" role="status">No tools found. Try JWT, JSON, Java, or Base64.</p>}
          </> : <>
            <p className="nav-caption">SECURITY</p>
            <button className={`nav-item nav-item-jwt ${section === 'jwt' ? 'active' : ''}`} onClick={() => navigate('jwt')}><span className="nav-icon"><ShieldCheck size={17} /></span><span className="nav-item-copy"><b>JWT Workbench</b></span></button>
            <p className="nav-caption nav-caption-spaced">ENCODING</p>
            <button className={`nav-item nav-item-base64 ${section === 'base64' ? 'active' : ''}`} onClick={() => navigate('base64')}><span className="nav-icon"><ArrowUpDown size={17} /></span><span className="nav-item-copy"><b>Base64 / 128</b></span></button>
            <p className="nav-caption nav-caption-spaced">FORMATTING</p>
            <button className={`nav-item nav-item-json ${section === 'json' ? 'active' : ''}`} onClick={() => navigate('json')}><span className="nav-icon"><Braces size={17} /></span><span className="nav-item-copy"><b>JSON Studio</b></span></button>
            <p className="nav-caption nav-caption-spaced">JAVA</p>
            <button className={`nav-item nav-item-java ${section === 'java' ? 'active' : ''}`} onClick={() => navigate('java')}><span className="nav-icon"><Code2 size={17} /></span><span className="nav-item-copy"><b>JSON to Java</b></span></button>
            {recentTools.length > 0 && <><p className="nav-caption nav-caption-spaced">RECENT</p>{recentTools.slice(0, 4).map((slug) => {
              return <button key={slug} className="nav-item recent-nav-item" onClick={() => openTool(slug)}><span className="nav-icon"><Clock3 size={16} /></span><span className="nav-item-copy"><b>{toolDisplayNames[slug] || slug}</b></span></button>
            })}<button className="nav-clear-button" onClick={clearRecentTools}>Clear history</button></>}
            {favoriteTools.length > 0 && <><p className="nav-caption nav-caption-spaced">FAVORITES</p>{favoriteTools.slice(0, 4).map((slug) => <button key={slug} className="nav-item" onClick={() => openTool(slug)}><span className="nav-icon"><Star size={16} /></span><span className="nav-item-copy"><b>{toolDisplayNames[slug] || slug}</b></span></button>)}<button className="nav-clear-button" onClick={clearFavoriteTools}>Clear favorites</button></>}
          </>}
        </nav>
        <nav className="mobile-site-links" aria-label="Site pages">
          <p className="nav-caption">JSTACK</p>
          <a href="/learning">Learning Center</a>
          <a href="/guide">Developer guide</a>
          <a href="/changelog">Changelog</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/feedback">Feedback</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/disclaimer">Disclaimer</a>
        </nav>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main id="main-content" className="main-content">
        {isOffline && <p className="connection-notice" role="status">Browser reports offline. Tools work locally after their code is loaded; first-time tool loads and page navigation may need a connection.</p>}
        <div className="page-layout">
          <div className="page-primary">
        {isHomepage && <HomePage onOpenTool={openTool} />}
        {section === 'jwt' && !isHomepage && <>
          <div className="page-heading"><div><h1>{jwtMode === 'Decode' ? 'JWT Decoder' : jwtMode === 'Encode & sign' ? 'JWT Encoder' : jwtMode === 'Verify' ? 'JWT Verifier' : jwtMode === 'Encrypt' ? 'JWE Encryptor' : jwtMode === 'Decrypt' ? 'JWE Decryptor' : 'JWT Keys'}</h1><p>Process token data securely inside this tab.</p></div><div className="heading-actions"><button className="icon-button favorite-button" aria-label="Favorite this tool" aria-pressed={favoriteTools.includes(jwtMode === 'Decode' ? 'jwt-decoder' : jwtMode === 'Encode & sign' ? 'jwt-encoder' : jwtMode === 'Verify' ? 'jwt-verifier' : jwtMode === 'Encrypt' ? 'jwe-encryptor' : jwtMode === 'Decrypt' ? 'jwe-decryptor' : 'jwt-key-generator')} onClick={() => toggleFavorite(jwtMode === 'Decode' ? 'jwt-decoder' : jwtMode === 'Encode & sign' ? 'jwt-encoder' : jwtMode === 'Verify' ? 'jwt-verifier' : jwtMode === 'Encrypt' ? 'jwe-encryptor' : jwtMode === 'Decrypt' ? 'jwe-decryptor' : 'jwt-key-generator')}><Star size={16} /></button><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Example</button></div></div>
          <div className="jwt-tabs" role="tablist" aria-label="JWT operations">{jwtModes.map((mode) => <button key={mode} id={`jwt-tab-${mode.toLowerCase().replace(/[^a-z]+/g, '-')}`} role="tab" aria-controls="jwt-workbench-panel" aria-selected={jwtMode === mode} tabIndex={jwtMode === mode ? 0 : -1} className={jwtMode === mode ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, jwtModes, jwtMode, (value) => { const slug = Object.keys(toolRoutes).find((key) => toolRoutes[key].jwtMode === value); if (slug) openTool(slug); setNotice(null); setDecoded(null) })} onClick={() => { const slug = Object.keys(toolRoutes).find((key) => toolRoutes[key].jwtMode === mode); if (slug) openTool(slug); setNotice(null); setDecoded(null) }}>{mode === 'Encrypt' || mode === 'Decrypt' ? <LockKeyhole size={14} /> : mode === 'Keys' ? <FileKey2 size={14} /> : null}{mode}</button>)}</div>
          <div className="workbench-grid" id="jwt-workbench-panel" role="tabpanel" onInput={() => { invalidatePendingOperation(); clearJwtOutput() }}>
            <section className="editor-column">
              {(jwtMode === 'Decode' || jwtMode === 'Verify' || jwtMode === 'Decrypt') && <div className="field-block token-field"><div className="field-heading"><label htmlFor="jwt-token">{jwtMode === 'Decrypt' ? 'JWE token' : 'Encoded token'}</label><span className="field-meta">{token.trim() ? `${token.trim().length} chars` : 'Paste a compact token'}</span></div><textarea id="jwt-token" className="code-editor token-editor" value={token} onChange={(event) => setToken(event.target.value)} placeholder="eyJhbGciOi..." spellCheck={false} /><div className="field-tools"><button onClick={() => { setToken(''); clearJwtOutput() }}><RotateCcw size={13} /> Clear</button><button onClick={loadExample}><WandSparkles size={13} /> Example token</button><span>JWT: header.payload.signature</span></div></div>}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Encrypt') && (
                <>
                  {jwtMode === 'Encode & sign' && (
                    <div className="field-block">
                      <div className="field-heading"><label htmlFor="jwt-header">JOSE header</label><button className="text-action" type="button" onClick={() => { invalidatePendingOperation(); setHeader(''); clearJwtOutput() }}>Clear</button></div>
                      <textarea id="jwt-header" className="code-editor small-editor" value={header} onChange={(event) => setHeader(event.target.value)} spellCheck={false} />
                    </div>
                  )}
                  <div className="field-block">
                    <div className="field-heading"><label htmlFor="jwt-payload">{jwtMode === 'Encrypt' ? 'Plaintext payload' : 'JWT payload'}</label><button className="text-action" type="button" onClick={() => { invalidatePendingOperation(); setPayload(''); clearJwtOutput() }}>Clear</button></div>
                    <textarea id="jwt-payload" className="code-editor payload-editor" value={payload} onChange={(event) => setPayload(event.target.value)} spellCheck={false} />
                  </div>
                  {jwtMode === 'Encode & sign' && (
                    <section className="claims-helper" aria-labelledby="jwt-claim-shortcuts-heading">
                      <div className="claims-helper-heading">
                        <div>
                          <h3 id="jwt-claim-shortcuts-heading">Claim shortcuts</h3>
                          <p>Add an example to your payload, then edit it for your service. JWT time values use seconds since Jan 1, 1970.</p>
                        </div>
                      </div>
                      <div className="claims-strip">
                        {jwtClaimShortcuts.map(({ key, label, meaning, example, accessibleExample }) => (
                          <button
                            key={key}
                            type="button"
                            className="claim-quick-add"
                            aria-label={`Add ${label.toLowerCase()} claim (${key}). ${meaning}. Sample: ${accessibleExample}`}
                            title={`${meaning}. Adds a sample value: ${example}`}
                            onClick={() => addRegisteredClaim(key)}
                          >
                            <span className="claim-quick-add-title"><span>{label}</span><code>{key}</code></span>
                            <small>{example}</small>
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Verify' || jwtMode === 'Encrypt' || jwtMode === 'Decrypt') && <div className={`field-block crypto-settings ${advancedJwtOpen ? 'advanced-open' : ''}`}><div className="field-heading"><label htmlFor="jwt-algorithm">{jweMode ? 'Key management / content encryption' : 'Signing algorithm'}</label><span className="field-meta">{jweMode ? 'JWE' : 'JWS'}</span></div><div className="settings-row"><select id="jwt-algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>{(jweMode ? JWE_ALGORITHMS : JWS_ALGORITHMS).map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="text-action advanced-toggle" type="button" aria-expanded={advancedJwtOpen} onClick={() => setAdvancedJwtOpen(!advancedJwtOpen)}><ChevronDown size={13} /> Advanced</button></div>{advancedJwtOpen && jwtMode === 'Verify' && <div className="verify-claims-row"><label htmlFor="jwt-issuer">Expected issuer<input id="jwt-issuer" value={expectedIssuer} onChange={(event) => setExpectedIssuer(event.target.value)} placeholder="https://issuer.example" /></label><label htmlFor="jwt-audience">Expected audience<input id="jwt-audience" value={expectedAudience} onChange={(event) => setExpectedAudience(event.target.value)} placeholder="java-api" /></label><label className="tolerance-control">Clock tolerance <input type="number" min="0" max="300" value={tolerance} onChange={(event) => setTolerance(event.target.value)} aria-label="Clock tolerance in seconds" /><span>sec</span></label></div>}<div className="advanced-key-settings"><div className="field-heading key-label"><label htmlFor="jwt-key">{jweMode ? (jwtMode === 'Encrypt' ? (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA public key') : (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA private key')) : algorithm.startsWith('HS') ? 'Shared secret' : jwtMode === 'Verify' ? 'Public key · SPKI' : 'Private key · PKCS#8'}</label><div className="key-actions"><button className="text-action" type="button" onClick={() => { invalidatePendingOperation(); setSecret(''); clearJwtOutput() }}>Clear</button><button className="text-action" type="button" disabled={busy} onClick={() => void generateKey()}><KeyRound size={13} /> Generate key</button></div></div><textarea id="jwt-key" className={`code-editor key-editor ${secret ? 'key-filled' : ''}`} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={algorithm.startsWith('HS') || algorithm.startsWith('dir') ? 'Paste secret or generate a secure key…' : '-----BEGIN PUBLIC KEY / PRIVATE KEY-----'} spellCheck={false} /><p className="key-hint">{jweMode ? 'A256GCM needs a 32-byte key. RSA mode needs a matching public/private pair.' : algorithm.startsWith('HS') ? `${algorithm} uses the UTF-8 bytes of the text entered (at least ${algorithm === 'HS256' ? 32 : algorithm === 'HS384' ? 48 : 64} bytes). Generated Base64URL text is used verbatim; keep it private.` : 'Asymmetric signatures use a private key to sign and the matching public key to verify.'}</p></div></div>}
              {jwtMode === 'Keys' && <KeyGenerator onGenerate={async (alg) => { setAlgorithm(alg); return await generateKey(alg) }} />}
              {jwtMode !== 'Keys' && <div className="run-row"><button className="button button-primary run-button" onClick={() => void runJwt()} disabled={busy}>{busy ? <span className="spinner" /> : jwtMode === 'Verify' ? <ShieldCheck size={16} /> : jwtMode === 'Decrypt' ? <LockKeyhole size={15} /> : <WandSparkles size={15} />}{jwtMode === 'Decode' ? 'Decode token' : jwtMode === 'Encode & sign' ? 'Sign JWT' : jwtMode === 'Verify' ? 'Verify token' : jwtMode === 'Encrypt' ? 'Encrypt payload' : 'Decrypt token'}</button></div>}
            </section>
            <section className="result-column" aria-live="polite"><div className="result-top"><div><span className="result-overline">RESULT</span><h2>{jwtMode === 'Decode' ? 'Token inspection' : jwtMode === 'Verify' ? 'Verification result' : jwtMode === 'Keys' ? 'Generated material' : 'Output'}</h2></div><div className="result-actions"><button className="icon-button result-copy" aria-label="Copy result" title="Copy result" disabled={!jwtExport} onClick={() => void copyText(jwtExport)}><Copy size={15} /></button><button className="icon-button result-copy" aria-label="Download result" title="Download result" disabled={!jwtExport} onClick={() => downloadText(jwtExport, jwtExportName)}><Download size={15} /></button></div></div>
              {notice && <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : undefined}><span className="notice-icon">{notice.tone === 'success' ? <Check size={15} /> : notice.tone === 'error' ? <X size={15} /> : <CircleHelp size={15} />}</span><div><b>{notice.title}</b><p>{notice.detail}</p></div></div>}
              {decoded ? <div className="decoded-panels"><JsonPanel title="HEADER" value={decoded.header} accent="lime" /><JsonPanel title="PAYLOAD" value={decoded.payload} accent="blue" /><div className="signature-panel"><div className="json-panel-heading"><span className="signature-dot" />SIGNATURE <span className="field-meta">{decoded.signature.length} chars</span></div><code>{decoded.signature || '(empty)'}</code></div></div> : jwtResult ? <div className="output-box"><div className="output-format"><span className="output-dot" />{jwtMode === 'Keys' ? 'KEY MATERIAL' : jwtMode === 'Decrypt' ? 'PLAINTEXT' : 'COMPACT TOKEN'}<button onClick={() => void copyText(jwtResult)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button><button onClick={() => downloadText(jwtResult, jwtExportName)}><Download size={13} />Download</button></div><pre>{jwtResult}</pre></div> : <div className="empty-result"><div className="empty-graphic"><span className="empty-bracket">{'{ }'}</span><span className="empty-lock"><LockKeyhole size={18} /></span></div><b>Ready when you are</b><p>{jwtMode === 'Decode' ? 'Paste a JWT above to inspect its header and payload.' : jwtMode === 'Verify' ? 'Add a token and verification key to validate this JWT.' : jwtMode === 'Encrypt' ? 'Add a payload and key, then encrypt in this tab.' : jwtMode === 'Decrypt' ? 'Paste a JWE and provide its matching decryption key.' : jwtMode === 'Keys' ? 'Generate key material to see it here.' : 'Add a payload and signing key, then sign your JWT.'}</p></div>}
              <div className="result-foot"><span>{decoded ? 'JWT · COMPACT SERIALIZATION' : 'READY'}</span><button type="button" onClick={() => { invalidatePendingOperation(); clearJwtOutput(); setActionMessage('') }}>Reset result</button></div>
            </section>
          </div>

        </>}

        {section === 'json' && <>
          <div className="page-heading converter-heading"><div><h1>JSON Tools</h1><p>Format, minify, or validate JSON locally.</p></div><div className="heading-actions"><button className="icon-button favorite-button" aria-label="Favorite this tool" aria-pressed={favoriteTools.includes(requestedTool || 'json-formatter')} onClick={() => toggleFavorite(requestedTool || 'json-formatter')}><Star size={16} /></button><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div></div>
          <section className="converter-workspace json-workspace" onInput={() => { invalidatePendingOperation(); setConverterOutput(''); setConverterError(''); setConverterHasRun(false) }}><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon"><Braces size={17} /></span><div><b>JSON formatter & validator</b></div></div><div className="json-mode-tabs" role="tablist" aria-label="JSON operation">{(['format', 'minify', 'validate'] as const).map((mode) => <button key={mode} role="tab" aria-selected={jsonMode === mode} tabIndex={jsonMode === mode ? 0 : -1} className={jsonMode === mode ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, ['format', 'minify', 'validate'], jsonMode, (value) => { const slug = value === 'format' ? 'json-formatter' : value === 'minify' ? 'json-minifier' : 'json-validator'; openTool(slug); setConverterOutput(''); setConverterError(''); setConverterHasRun(false) })} onClick={() => { openTool(mode === 'format' ? 'json-formatter' : mode === 'minify' ? 'json-minifier' : 'json-validator'); setConverterOutput(''); setConverterError(''); setConverterHasRun(false) }}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor="converter-input">JSON INPUT</label><button onClick={() => { invalidatePendingOperation(); setConverterInput(''); setConverterOutput(''); setConverterError(''); setConverterHasRun(false) }}><X size={13} /> Clear</button></div><textarea id="converter-input" className="code-editor converter-editor" value={converterInput} onChange={(event) => setConverterInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void runConverter() } }} placeholder="Paste JSON here…" spellCheck={false} /><div className="pane-footer"><span>{converterInput.length} characters · max {MAX_TOOL_INPUT_LENGTH.toLocaleString()}</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={() => void runConverter()} disabled={converterBusy} aria-busy={converterBusy} aria-label={`Run JSON ${jsonMode}`}>{converterBusy ? <span className="spinner" /> : <ArrowLeftRight size={17} />}</button></div>
              <div className="converter-pane output-pane" aria-live="polite" aria-busy={converterBusy}><div className="pane-heading"><span>{jsonMode === 'validate' ? 'VALIDATION' : 'OUTPUT'}</span><div className="output-actions"><button disabled={!converterOutput} onClick={() => void copyText(converterOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button><button disabled={!converterOutput} onClick={() => downloadText(converterOutput, jsonMode === 'validate' ? 'json-validation.txt' : 'formatted.json')}><Download size={13} />Download</button></div></div>{converterBusy ? <div className="output-placeholder" role="status"><span className="spinner" /><b>Processing JSON…</b></div> : converterError ? <div className="converter-error" role="alert"><X size={15} />{converterError}</div> : converterHasRun ? converterOutput ? <pre className={`code-editor converter-output ${jsonMode === 'validate' ? 'validation-output' : ''}`}>{converterOutput}</pre> : <div className="output-placeholder output-empty" role="status"><b>Empty output</b><small>The operation completed and returned no text.</small></div> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>{jsonMode === 'validate' ? 'JSON validity will be reported here' : 'Run the operation to see a result'}</small></div>}
                <div className="pane-footer"><span>{converterHasRun ? `${converterOutput.length} characters` : 'Waiting for input'}</span><button onClick={() => { invalidatePendingOperation(); setConverterOutput(''); setConverterError(''); setConverterHasRun(false) }}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
          <div className="java-note date-note"><CircleHelp size={15} /><span>Validation checks JSON syntax only. It does not check a schema, required fields, or application rules.</span></div>

        </>}
        {section === 'java' && <>
          <div className="page-heading converter-heading"><div><h1>JSON To Java Models</h1><p>Generate Java records or POJO classes locally.</p></div><div className="heading-actions"><button className="icon-button favorite-button" aria-label="Favorite this tool" aria-pressed={favoriteTools.includes('json-to-java')} onClick={() => toggleFavorite('json-to-java')}><Star size={16} /></button><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div></div>
          <section className="converter-workspace json-workspace java-workspace">
            <div className="converter-toolbar java-toolbar">
              <div className="converter-title"><span className="converter-title-icon"><Code2 size={17} /></span><div><b>Java model generator</b></div></div>
              <div className="java-controls">
                <label htmlFor="java-class-name">Root class <input id="java-class-name" className="java-class-input" value={javaClassName} onChange={(event) => { setJavaClassName(event.target.value); setJavaOutput(''); setJavaError(''); setJavaHasRun(false) }} /></label>
                <div className="json-mode-tabs" role="tablist" aria-label="Java model style">
                  {(['record', 'pojo'] as const).map((style) => <button key={style} role="tab" aria-selected={javaStyle === style} tabIndex={javaStyle === style ? 0 : -1} className={javaStyle === style ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, ['record', 'pojo'], javaStyle, (value) => { setJavaStyle(value as JavaModelStyle); setJavaOutput(''); setJavaError(''); setJavaHasRun(false) })} onClick={() => { setJavaStyle(style); setJavaOutput(''); setJavaError(''); setJavaHasRun(false) }}>{style === 'record' ? 'Record' : 'POJO'}</button>)}
                </div>
              </div>
            </div>
            <div className="converter-editors">
              <div className="converter-pane">
                <div className="pane-heading"><label htmlFor="java-json-input">JSON INPUT</label><button onClick={() => { setJavaInput(''); setJavaOutput(''); setJavaError(''); setJavaHasRun(false) }}><X size={13} /> Clear</button></div>
                <textarea id="java-json-input" className="code-editor converter-editor" value={javaInput} onChange={(event) => { setJavaInput(event.target.value); setJavaOutput(''); setJavaError(''); setJavaHasRun(false) }} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runJavaModel() } }} placeholder="Paste a JSON object here…" spellCheck={false} />
                <div className="pane-footer"><span>{javaInput.length} characters · max {MAX_JAVA_INPUT_LENGTH.toLocaleString()}</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div>
              </div>
              <div className="converter-actions"><button className="convert-button" onClick={runJavaModel} aria-label="Generate Java model"><ArrowLeftRight size={17} /></button></div>
              <div className="converter-pane output-pane" aria-live="polite">
                <div className="pane-heading"><span>JAVA SOURCE</span><div className="output-actions"><button disabled={!javaOutput} onClick={() => void copyText(javaOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button><button disabled={!javaOutput} onClick={() => downloadText(javaOutput, `${javaClassName.trim() || 'GeneratedModel'}.java`)}><Download size={13} />Download</button></div></div>
                {javaError ? <div className="converter-error" role="alert"><X size={15} />{javaError}</div> : javaHasRun ? javaOutput ? <pre className="code-editor converter-output java-output" tabIndex={0} aria-label="Generated Java source">{javaOutput}</pre> : <div className="output-placeholder output-empty" role="status"><b>Empty output</b><small>The generator completed without source.</small></div> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Java source appears here</b><small>Paste a JSON object and generate a model</small></div>}
                <div className="pane-footer"><span>{javaHasRun ? `${javaOutput.length} characters` : 'Waiting for input'}</span><button onClick={() => { setJavaOutput(''); setJavaError(''); setJavaHasRun(false) }}><RotateCcw size={12} /> Reset</button></div>
              </div>
            </div>
          </section>

          <div className="java-note"><CircleHelp size={15} /><span><b>Output notes.</b> Nullable fields use reference types; empty or mixed values use <code>Object</code>. Records require Java 16 or newer. Renamed JSON keys add Jackson <code>@JsonProperty</code> annotations and require <code>jackson-annotations</code>.</span></div>
        </>}
        {section === 'base64' && <>
          <div className="page-heading converter-heading"><div><h1>{encodingFormat === 'base64' ? 'Base64 Converter' : 'Base128 Converter'}</h1><p>{encodingFormat === 'base64' ? 'Encode or decode UTF-8 text.' : 'Use JStack’s custom printable 7-bit format.'}</p></div><div className="heading-actions"><button className="icon-button favorite-button" aria-label="Favorite this tool" aria-pressed={favoriteTools.includes(requestedTool || (encodingFormat === 'base128' ? 'base128-converter' : 'base64-converter'))} onClick={() => toggleFavorite(requestedTool || (encodingFormat === 'base128' ? 'base128-converter' : 'base64-converter'))}><Star size={16} /></button><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div></div>
          <div className="encoding-format-switch" role="tablist" aria-label="Encoding format">
            <button role="tab" aria-selected={encodingFormat === 'base64'} tabIndex={encodingFormat === 'base64' ? 0 : -1} className={encodingFormat === 'base64' ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, ['base64', 'base128'], encodingFormat, (value) => openTool(value === 'base64' ? 'base64-converter' : 'base128-converter'))} onClick={() => openTool('base64-converter')}><span className="encoding-format-icon"><ArrowUpDown size={17} /></span><span><b>Base64</b><small>Standard format</small></span></button>
            <button role="tab" aria-selected={encodingFormat === 'base128'} tabIndex={encodingFormat === 'base128' ? 0 : -1} className={encodingFormat === 'base128' ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, ['base64', 'base128'], encodingFormat, (value) => openTool(value === 'base64' ? 'base64-converter' : 'base128-converter'))} onClick={() => openTool('base128-converter')}><span className="encoding-format-icon"><Binary size={17} /></span><span><b>Base128</b><small>JStack custom</small></span></button>
          </div>
          <section className="converter-workspace json-workspace" onInput={() => { invalidatePendingOperation(); setBase64Output(''); setBase64Error(''); setBase64HasRun(false); setBase128Output(''); setBase128Error(''); setBase128HasRun(false) }}><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon">{encodingFormat === 'base64' ? <ArrowUpDown size={17} /> : <Binary size={17} />}</span><div><b>{encodingFormat === 'base64' ? 'Base64 text converter' : 'Base128 converter'}</b></div></div><div className="json-mode-tabs" role="tablist" aria-label={`${encodingFormat} operation`}>{(['encode', 'decode'] as const).map((mode) => <button key={mode} role="tab" aria-selected={encodingMode === mode} tabIndex={encodingMode === mode ? 0 : -1} className={encodingMode === mode ? 'active' : ''} onKeyDown={(event) => moveTabSelection(event, ['encode', 'decode'], encodingMode, (value) => setEncodingMode(value as Base64Mode))} onClick={() => setEncodingMode(mode)}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor={encodingFormat === 'base64' ? 'base64-input' : 'base128-input'}>{encodingMode === 'encode' ? 'PLAIN TEXT' : `${encodingFormat.toUpperCase()} INPUT`}</label><button onClick={clearEncoding}><X size={13} /> Clear</button></div><textarea id={encodingFormat === 'base64' ? 'base64-input' : 'base128-input'} className="code-editor converter-editor" value={encodingInput} onChange={(event) => setEncodingInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runEncoding() } }} placeholder={encodingMode === 'encode' ? 'Type or paste plain text…' : encodingFormat === 'base64' ? 'Paste standard Base64…' : 'Paste JStack Base128 Braille text…'} spellCheck={false} /><div className="pane-footer"><span>{encodingInput.length} characters · max {MAX_TOOL_INPUT_LENGTH.toLocaleString()}</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={runEncoding} disabled={encodingBusy} aria-busy={encodingBusy} aria-label={`Run ${encodingFormat} ${encodingMode}`}>{encodingBusy ? <span className="spinner" /> : <ArrowLeftRight size={17} />}</button></div>
              <div className="converter-pane output-pane" aria-live="polite" aria-busy={encodingBusy}><div className="pane-heading"><span>OUTPUT</span><div className="output-actions"><button disabled={!encodingOutput} onClick={() => void copyText(encodingOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button><button disabled={!encodingOutput} onClick={() => downloadText(encodingOutput, `${encodingFormat}-output.txt`)}><Download size={13} />Download</button></div></div>{encodingBusy ? <div className="output-placeholder" role="status"><span className="spinner" /><b>Converting…</b></div> : encodingError ? <div className="converter-error" role="alert"><X size={15} />{encodingError}</div> : encodingHasRun ? encodingOutput ? <pre className="code-editor converter-output">{encodingOutput}</pre> : <div className="output-placeholder output-empty" role="status"><b>Empty output</b><small>The operation completed and returned an empty string.</small></div> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>{encodingFormat === 'base64' ? 'Standard Base64 output' : 'JStack’s printable Braille alphabet'}</small></div>}<div className="pane-footer"><span>{encodingHasRun ? `${encodingOutput.length} characters` : 'Waiting for input'}</span><button onClick={resetEncodingOutput}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
          {encodingFormat === 'base128'
            ? <div className="java-note date-note"><CircleHelp size={15} /><span>JStack Base128 is custom, not a universal standard. Use it only with a decoder using the same mapping (U+2801–U+2880).</span></div>
            : <div className="java-note date-note"><CircleHelp size={15} /><span>Base64 is a reversible encoding, not encryption. Anyone with the encoded text can decode it.</span></div>}

        </>}
        {section === 'about' && <AboutPage onHome={() => navigate('jwt')} />}
        {(actionMessage || Object.values(preferenceIssues).some(Boolean)) && <p className="tool-action-status" role="status">{[actionMessage, ...Object.values(preferenceIssues).filter(Boolean)].filter(Boolean).join(' ')}</p>}
        {!isHomepage && <section className="related-tools" aria-label="Related tools"><span>KEEP GOING</span>{(section === 'jwt' ? ['jwt-verifier', 'jwe-encryptor', 'json-validator'] : section === 'java' ? ['json-formatter', 'json-validator'] : section === 'json' ? ['json-to-java', 'base64-converter'] : ['base64-converter', 'base128-converter', 'json-formatter']).filter((slug) => slug !== requestedTool).map((slug) => <button key={slug} onClick={() => openTool(slug)}>{toolDisplayNames[slug]}</button>)}<a href="/learning">Learning Center</a></section>}
        <footer className="page-footer"><span>JSTACK <i>·</i> DEVELOPER TOOLS</span><div><a href="/learning">Learning</a><a href="/blog">Blog</a><a href="/guide">Guide</a><a href="/changelog">Changelog</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/feedback">Feedback</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></div></footer>
          </div>
        </div>
      </main>
    </div>
  </div>
}

function HomePage({ onOpenTool }: { onOpenTool: (slug: string) => void }) {
  const groupedTools = ['JWT & JWE', 'JSON', 'JAVA', 'ENCODING'].map((category) => ({
    category,
    tools: homeTools.filter((tool) => tool.category === category),
  }))

  return <div className="home-page">
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1>Java &amp; Backend Developer Workbench</h1>
        <p>100% client-side tools. Your tokens and JSON are processed in this browser—not uploaded to JStack.</p>
        <p className="home-shortcut"><kbd>Ctrl</kbd> + <kbd>K</kbd> Search all tools</p>
      </div>
    </section>

    <section className="home-tools" aria-labelledby="home-tools-title">
      <div className="home-section-heading"><div><span>DEVELOPER TOOLS</span><h2 id="home-tools-title">Choose a tool</h2></div><span className="home-tool-count">12 free tools</span></div>
      <div className="home-tool-groups">{groupedTools.map(({ category, tools }) => {
        const Icon = category === 'JWT & JWE' ? ShieldCheck
          : category === 'JSON' ? Braces
            : category === 'JAVA' ? Code2
              : ArrowUpDown
        const categoryClass = category === 'JWT & JWE' ? 'jwt'
          : category === 'JSON' ? 'json'
            : category === 'JAVA' ? 'java'
              : 'encoding'
        return <Fragment key={category}>
          <section className="home-tool-group" aria-label={`${category.toLowerCase()} tools`}>
            <h3>{category}</h3>
            <div className="home-tool-grid">{tools.map((tool) =>
              <button className="home-tool-card" key={tool.slug} aria-label={`Open ${tool.title}`} onClick={() => onOpenTool(tool.slug)}>
                <span className={`home-tool-icon home-tool-icon-${categoryClass}`} aria-hidden="true"><Icon size={17} /></span>
                <span className="home-tool-content">
                  <span className="home-tool-heading"><span className="home-tool-title">{tool.title}</span>{tool.badge && <span className="home-tool-badge">{tool.badge}</span>}</span>
                  <span className="home-tool-detail">{tool.description}</span>
                </span>
                <span className="home-tool-arrow" aria-hidden="true">→</span>
              </button>
            )}</div>
          </section>
          {category === 'JWT & JWE' && <aside className="home-ad-slot" aria-label="Advertisement"><span>Advertisement</span></aside>}
        </Fragment>
      })}</div>
    </section>

    <section className="home-guides" aria-labelledby="home-guides-title">
      <div className="home-section-heading">
        <div><span>LEARN &amp; BUILD</span><h2 id="home-guides-title">Developer Guides &amp; Security</h2></div>
        <a href="/learning">Visit Learning Center <span aria-hidden="true">→</span></a>
      </div>
      <div className="home-guide-grid">{homeGuides.map((guide) =>
        <a className="home-guide-card" href={guide.href} key={guide.href}>
          <span className="home-guide-label">{guide.label}</span>
          <strong>{guide.title}</strong>
          <span className="home-guide-description">{guide.description}</span>
          <span className="home-guide-action">Read guide <span aria-hidden="true">→</span></span>
        </a>
      )}</div>
    </section>
  </div>
}

function JsonPanel({ title, value, accent }: { title: string; value: Record<string, unknown>; accent: 'lime' | 'blue' }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [copyError, setCopyError] = useState('')
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  const copyPanel = async () => {
    setCopyError('')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await runWithTimeout(navigator.clipboard.writeText(JSON.stringify(value, null, 2)), CLIPBOARD_TIMEOUT_MS, CLIPBOARD_TIMEOUT_MESSAGE)
      if (!mountedRef.current) return
    } catch {
      if (!mountedRef.current) return
      const output = panelRef.current?.querySelector('pre')
      const selection = window.getSelection()
      if (!output || !selection) {
        setCopyError('Clipboard is unavailable. Select the JSON manually.')
        return
      }
      try {
        const range = document.createRange()
        range.selectNodeContents(output)
        selection.removeAllRanges()
        selection.addRange(range)
        setCopyError('Clipboard access is unavailable. JSON selected; press Ctrl+C or Command+C.')
      } catch {
        setCopyError('Clipboard is unavailable. Select the JSON manually.')
      }
    }
  }
  return <div className={`json-panel json-${accent}`} ref={panelRef}><div className="json-panel-heading"><span className="json-dot" />{title}<span className="field-meta">JSON</span><button aria-label={`Copy ${title.toLowerCase()}`} onClick={() => void copyPanel()}><Copy size={12} /></button></div><pre>{JSON.stringify(value, null, 2)}</pre>{copyError && <p role="status">{copyError}</p>}</div>
}

function KeyGenerator({ onGenerate }: { onGenerate: (algorithm: string) => Promise<boolean> }) {
  const [keyType, setKeyType] = useState('HS256')
  const [status, setStatus] = useState('')
  const [generating, setGenerating] = useState(false)
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  const generate = async () => {
    setGenerating(true)
    setStatus('Generating securely…')
    try {
      const succeeded = await onGenerate(keyType)
      if (mountedRef.current) {
        setStatus(succeeded ? 'Key material added to the output panel.' : 'Key generation failed. See the operation message for details.')
      }
    } catch (error) {
      if (mountedRef.current) setStatus(getOperationErrorMessage(error))
    } finally {
      if (mountedRef.current) setGenerating(false)
    }
  }
  return <div className="key-generator-card"><div className="key-generator-top"><span className="generator-icon"><FileKey2 size={20} /></span><div><h3>Key generation</h3><p>Create algorithm-compatible material using Web Crypto in this browser.</p></div></div><label htmlFor="key-type">Key type and algorithm</label><select id="key-type" value={keyType} onChange={(event) => setKeyType(event.target.value)}><optgroup label="Symmetric"><option value="HS256">HMAC SHA-256 · 256-bit secret</option><option value="HS384">HMAC SHA-384 · 384-bit secret</option><option value="HS512">HMAC SHA-512 · 512-bit secret</option><option value="dir/A256GCM">AES-GCM · 256-bit JWE key</option></optgroup><optgroup label="Asymmetric"><option value="RS256">RSA 2048 · RS256</option><option value="PS256">RSA 2048 · PS256</option><option value="ES256">ECDSA P-256 · ES256</option><option value="RSA-OAEP-256/A256GCM">RSA 2048 · JWE</option></optgroup></select><div className="key-generator-facts"><span><Check size={13} /> Browser generated</span><span><Check size={13} /> Private key never uploaded</span><span><Check size={13} /> PEM / Base64URL output</span></div><p className="key-security-warning">Generated secrets and private keys are shown in the output panel. Treat downloaded or copied key material as sensitive.</p><button className="button button-primary" onClick={() => void generate()} disabled={generating}>{generating ? <span className="spinner" /> : <KeyRound size={15} />}{generating ? 'Generating…' : 'Generate key material'}</button>{status && <p className="key-status" role="status">{status}</p>}</div>
}

function AboutPage({ onHome }: { onHome: () => void }) {
  return <div className="info-page about-page">
    <h1>Java Developer Tools For Everyday Backend Work</h1>
    <p className="info-intro">JStack brings practical JWT, JSON, Java model, and text-encoding tools together in one easy-to-use workspace.</p>
    <div className="about-grid">
      <article><span><ShieldCheck size={17} /></span><h2>JWT and JWE tools</h2><p><a href="/jwt-decoder">Decode JWTs</a>, sign and verify JWS tokens, or encrypt supported JWE formats. Decoding reveals content; it does not verify a token or authorize access.</p></article>
      <article><span><Braces size={17} /></span><h2>JSON and Java</h2><p><a href="/json-formatter">Format JSON</a>, check its syntax, or <a href="/json-to-java">generate Java records and POJOs</a> from an example object. Generated types are an inference, not a schema.</p></article>
      <article><span><ArrowUpDown size={17} /></span><h2>Text encoders</h2><p>Convert UTF-8 text with <a href="/base64-converter">standard Base64</a> or JStack’s custom Base128 format. Base64 is not encryption, and Base128 is not a universal standard.</p></article>
      <article><span><LockKeyhole size={17} /></span><h2>Privacy and safety</h2><p>Tool inputs are processed in this browser and are not sent to a JStack application backend or saved in local storage. Theme, recent-tool, and favorite-tool preferences may be stored locally. <a href="/privacy">Read the privacy policy</a>.</p></article>
    </div>
    <div className="policy-disclaimer"><b>Need help?</b><p>See the <a href="/guide">developer guide</a> or <a href="/learning">Learning Center</a> for practical examples, or <a href="/contact">contact JStack</a>. Never send production tokens, passwords, or private keys.</p></div>
    <section className="faq-section">
      <div className="faq-heading"><span><CircleHelp size={15} /></span><div><small>COMMON QUESTIONS</small><h2>Frequently asked questions</h2></div></div>
      <details><summary>Does JStack upload my token or key?</summary><p>No. JWT, JWE, JSON, Java, and text operations run in the current browser tab. Do not paste real production secrets into any shared or public computer.</p></details>
      <details><summary>Does decoding a JWT verify its signature?</summary><p>No. Decoding only reads the Base64URL header and payload. Signature verification and application authorization are separate operations.</p></details>
      <details><summary>Is JSON validation the same as schema validation?</summary><p>No. JStack checks JSON syntax and can format or minify it, but it does not enforce API fields, required values, or business rules.</p></details>
      <details><summary>Is generated Java code ready to ship?</summary><p>It is an inferred starting point. Review names, types, nullability, deserialization annotations, packages, and API compatibility before production use.</p></details>
      <details><summary>Is JStack Base128 a standard?</summary><p>No. JStack Base128 uses a custom printable mapping, so both encoder and decoder must use the same mapping.</p></details>
    </section>
    <section className="changelog-strip"><span><WandSparkles size={15} /></span><div><small>PLATFORM STATUS</small><b>Browser-first tools · JWS/JWE · JSON · Java · Base64</b></div></section>
    <button className="button button-secondary back-tool" onClick={onHome}><ArrowLeftRight size={14} /> Open the tool workspace</button>
  </div>
}

export default App