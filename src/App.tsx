import { useEffect, useState } from 'react'
import {
  ArrowLeftRight, ArrowUpDown, Binary, BookOpenText, Braces, Check, ChevronDown, CircleHelp,
  Code2, Copy, FileKey2, KeyRound, LockKeyhole, Menu, Moon,
  RotateCcw, ShieldCheck, Sun, TerminalSquare, WandSparkles, X,
} from 'lucide-react'
import { JWE_ALGORITHMS, JWS_ALGORITHMS } from './lib/jwt-constants'
import { generateJavaModel, type JavaModelStyle } from './lib/javaModel'
import { decodeBase128Text, encodeTextBase128 } from './lib/textBase128'
import './App.css'

type Section = 'jwt' | 'json' | 'java' | 'base64' | 'about'
type JwtMode = 'Decode' | 'Encode & sign' | 'Verify' | 'Encrypt' | 'Decrypt' | 'Keys'
type JsonMode = 'format' | 'minify' | 'validate'
type Base64Mode = 'encode' | 'decode'
type EncodingFormat = 'base64' | 'base128'
type Notice = { tone: 'success' | 'warning' | 'error'; title: string; detail: string }
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

const jwtModes: JwtMode[] = ['Encode & sign', 'Verify', 'Decode', 'Encrypt', 'Decrypt', 'Keys']
const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqYXZhLWRldiIsInJvbGUiOiJlbmdpbmVlciIsImlhdCI6MTcwNDA2NzIwMH0.c2FtcGxlLXNpZ25hdHVyZQ'
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

function updateMeta(attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = value
}

function App() {
  const requestedTool = new URLSearchParams(window.location.search).get('tool')
  const initialRoute = requestedTool ? toolRoutes[requestedTool] : undefined
  const [section, setSection] = useState<Section>(initialRoute?.section ?? 'jwt')
  const [jwtMode, setJwtMode] = useState<JwtMode>(initialRoute?.jwtMode ?? 'Encode & sign')
  const [jsonMode, setJsonMode] = useState<JsonMode>(initialRoute?.jsonMode ?? 'format')
  const [base64Mode, setBase64Mode] = useState<Base64Mode>(initialRoute?.base64Mode ?? 'encode')
  const [base128Mode, setBase128Mode] = useState<Base64Mode>(initialRoute?.base128Mode ?? 'encode')
  const [encodingFormat, setEncodingFormat] = useState<EncodingFormat>(initialRoute?.encodingFormat ?? 'base64')
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('jstack-theme-v2') === 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [token, setToken] = useState('')
  const [header, setHeader] = useState('{\n  "typ": "JWT"\n}')
  const [payload, setPayload] = useState('{\n  "sub": "java-dev",\n  "role": "engineer",\n  "iat": 1704067200\n}')
  const [algorithm, setAlgorithm] = useState<string>('HS256')
  const [secret, setSecret] = useState('')
  const [tolerance, setTolerance] = useState('0')
  const [jwtResult, setJwtResult] = useState('')
  const [decoded, setDecoded] = useState<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [converterInput, setConverterInput] = useState('{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "address": {\n    "city": "London",\n    "postalCode": "N1"\n  },\n  "roles": ["admin", "author"]\n}')
  const [converterOutput, setConverterOutput] = useState('')
  const [converterError, setConverterError] = useState('')
  const [javaInput, setJavaInput] = useState(sampleJavaInput)
  const [javaOutput, setJavaOutput] = useState('')
  const [javaError, setJavaError] = useState('')
  const [javaClassName, setJavaClassName] = useState('User')
  const [javaStyle, setJavaStyle] = useState<JavaModelStyle>('record')
  const [base64Input, setBase64Input] = useState('Java developers, welcome!')
  const [base64Output, setBase64Output] = useState('')
  const [base64Error, setBase64Error] = useState('')
  const [base128Input, setBase128Input] = useState('Java developers, welcome!')
  const [base128Output, setBase128Output] = useState('')
  const [base128Error, setBase128Error] = useState('')
  const [copied, setCopied] = useState(false)
  const [advancedJwtOpen, setAdvancedJwtOpen] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const jweMode = jwtMode === 'Encrypt' || jwtMode === 'Decrypt'
  const isHomepage = section === 'jwt' && !requestedTool

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('jstack-theme-v2', theme)
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.content = darkMode ? '#131816' : '#F7F9F7'
  }, [darkMode])
  useEffect(() => {
    if (!token && !secret) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [token, secret])
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
      ? 'JStack – Free Java Developer Tools for JWT, JSON & Base64'
      : section === 'jwt' ? jwtRoute.title
        : section === 'json' ? jsonRoute.title
        : section === 'base64' ? (encodingFormat === 'base128' ? toolRoutes['base128-converter'].title : toolRoutes['base64-converter'].title)
          : section === 'java' ? javaRoute.title
          : 'About JStack · Browser-Based Developer Tools')
    const pageDescription = route?.description ?? (isHome
      ? 'Free online Java developer tools for inspecting JWTs, formatting JSON, generating Java models, and converting text in your browser.'
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

  const navigate = (next: Section) => { setSection(next); setSidebarOpen(false) }
  const matchesToolSearch = (names: string) => {
    const query = toolSearch.trim().toLowerCase()
    return !query || names.toLowerCase().includes(query)
  }
  const runJwt = async () => {
    setBusy(true); setNotice(null); setDecoded(null); setJwtResult('')
    try {
      const { decodeJwtToken, decryptJwe, encryptJwe, signJwt, verifyJwt } = await import('./lib/jwt')
      if (jwtMode === 'Decode') {
        if (token.trim().split('.').length === 5) throw new Error('This is a five-part JWE. Choose Decrypt to inspect it after successful decryption.')
        setDecoded(decodeJwtToken(token))
        setNotice({ tone: 'warning', title: 'Decoded, not verified', detail: 'This only reads token contents. It does not establish that the signature or claims are trustworthy.' })
      } else if (jwtMode === 'Encode & sign') {
        setJwtResult(await signJwt(header, payload, algorithm as typeof JWS_ALGORITHMS[number], secret))
        setNotice({ tone: 'success', title: 'JWT signed', detail: `Signed locally using ${algorithm}. Keep your signing key private.` })
      } else if (jwtMode === 'Verify') {
        const verified = await verifyJwt(token, algorithm as typeof JWS_ALGORITHMS[number], secret, Number(tolerance) || 0)
        setDecoded({ header: verified.protectedHeader, payload: verified.payload, signature: token.split('.')[2] || '' })
        setNotice({ tone: 'success', title: 'Signature and registered claims verified', detail: `Verified locally with ${algorithm}. This does not replace authorization checks.` })
      } else if (jwtMode === 'Encrypt') {
        setJwtResult(await encryptJwe(payload, algorithm as typeof JWE_ALGORITHMS[number], secret))
        setNotice({ tone: 'success', title: 'JWE encrypted', detail: `Encrypted locally using ${algorithm}. Keep the decryption key private.` })
      } else if (jwtMode === 'Decrypt') {
        const result = await decryptJwe(token, algorithm as typeof JWE_ALGORITHMS[number], secret)
        setJwtResult(result.plaintext)
        setNotice({ tone: 'success', title: 'JWE decrypted', detail: `Decrypted locally using ${algorithm}. Header: ${JSON.stringify(result.header)}` })
      }
    } catch (error) {
      setNotice({ tone: 'error', title: 'Operation failed', detail: error instanceof Error ? error.message : 'Check the input and try again.' })
    } finally { setBusy(false) }
  }

  const generateKey = async (requestedAlgorithm = algorithm) => {
    try {
      const { generateJwtKey } = await import('./lib/jwt')
      const generated = await generateJwtKey(requestedAlgorithm)
      if (generated.secret) setSecret(generated.secret)
      else setSecret(jwtMode === 'Verify' || jwtMode === 'Encrypt' ? generated.publicKey || '' : generated.privateKey || '')
      setJwtResult(generated.secret || `PUBLIC KEY\n${generated.publicKey}\n\nPRIVATE KEY\n${generated.privateKey}`)
      setNotice({ tone: 'success', title: 'Key generated locally', detail: `${generated.format}. Private material is not saved.` })
    } catch (error) { setNotice({ tone: 'error', title: 'Key generation failed', detail: error instanceof Error ? error.message : 'This browser could not generate that key.' }) }
  }

  const runConverter = async () => {
    setConverterError('')
    try {
      const converterTools = await import('./lib/jsonTools')
      if (jsonMode === 'validate') {
        const result = converterTools.validateJson(converterInput)
        if (!result.valid) throw new Error(result.error)
        setConverterOutput(`Valid JSON · ${result.kind}`)
      } else setConverterOutput(jsonMode === 'format' ? converterTools.formatJson(converterInput) : converterTools.minifyJson(converterInput))
    } catch (error) { setConverterOutput(''); setConverterError(error instanceof Error ? error.message : 'Could not convert this input.') }
  }

  const runJavaModel = () => {
    setJavaError('')
    try {
      setJavaOutput(generateJavaModel(javaInput, { className: javaClassName, style: javaStyle }))
    } catch (error) {
      setJavaOutput('')
      setJavaError(error instanceof Error ? error.message : 'Could not generate a Java model.')
    }
  }

  const runBase64 = async () => {
    setBase64Error('')
    try {
      const base64Tools = await import('./lib/textBase64')
      setBase64Output(base64Mode === 'encode'
        ? base64Tools.encodeTextBase64(base64Input)
        : base64Tools.decodeBase64Text(base64Input))
    } catch (error) {
      setBase64Output('')
      setBase64Error(error instanceof Error ? error.message : 'Could not process this Base64 input.')
    }
  }

  const runBase128 = () => {
    setBase128Error('')
    try {
      setBase128Output(base128Mode === 'encode' ? encodeTextBase128(base128Input) : decodeBase128Text(base128Input))
    } catch (error) {
      setBase128Output('')
      setBase128Error(error instanceof Error ? error.message : 'Could not process this Base128 input.')
    }
  }

  const copyText = async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true); window.setTimeout(() => setCopied(false), 1400)
  }

  const loadExample = () => {
    if (section === 'jwt') { setToken(sampleJwt); setJwtMode('Decode'); return }
    if (section === 'java') {
      setJavaInput(sampleJavaInput)
      setJavaOutput('')
      setJavaError('')
      return
    }
    if (section === 'base64') {
      if (encodingFormat === 'base128') {
        const example = 'JStack ✓'
        setBase128Input(base128Mode === 'encode' ? example : encodeTextBase128(example))
        setBase128Output('')
        setBase128Error('')
        return
      }
      setBase64Input(base64Mode === 'encode' ? 'Java developers, welcome!' : 'SGVsbG8gV29ybGQh')
      setBase64Output('')
      setBase64Error('')
      return
    }
    setConverterInput('{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "roles": ["admin", "author"]\n}')
    setConverterOutput('')
    setConverterError('')
  }

  const encodingMode = encodingFormat === 'base64' ? base64Mode : base128Mode
  const encodingInput = encodingFormat === 'base64' ? base64Input : base128Input
  const encodingOutput = encodingFormat === 'base64' ? base64Output : base128Output
  const encodingError = encodingFormat === 'base64' ? base64Error : base128Error
  const setEncodingInput = (value: string) => {
    if (encodingFormat === 'base64') setBase64Input(value)
    else setBase128Input(value)
  }
  const setEncodingMode = (mode: Base64Mode) => {
    if (encodingFormat === 'base64') {
      setBase64Mode(mode)
      setBase64Output('')
      setBase64Error('')
    } else {
      setBase128Mode(mode)
      setBase128Output('')
      setBase128Error('')
    }
  }
  const clearEncoding = () => {
    setEncodingInput('')
    if (encodingFormat === 'base64') {
      setBase64Output('')
      setBase64Error('')
    } else {
      setBase128Output('')
      setBase128Error('')
    }
  }
  const resetEncodingOutput = () => {
    if (encodingFormat === 'base64') setBase64Output('')
    else setBase128Output('')
  }
  const runEncoding = () => {
    if (encodingFormat === 'base64') void runBase64()
    else runBase128()
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} title={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={19} /></button>
      <button className="brand" onClick={() => navigate('jwt')} aria-label="JStack home"><span className="brand-mark"><Code2 size={18} /></span><span>JStack</span></button>
      <nav className="topbar-nav" aria-label="Site navigation">
        <details className="tool-dropdown resource-dropdown">
          <summary>Resources <ChevronDown size={14} /></summary>
          <div className="tool-dropdown-menu">
            <a href="/guide"><BookOpenText size={15} /> Developer guide</a>
          </div>
        </details>
        <a href="/about">About</a>
        <a href="/contact">Feedback</a>
      </nav>
      <div className="topbar-actions">
        <button className="icon-button theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`} title={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </header>
    <div className="app-body">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline"><span className="sidebar-workspace-label">TOOLS</span></div>
        <nav aria-label="Main navigation">
          <label className="nav-tool-search"><span className="sr-only">Filter tools</span><input value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} placeholder="Filter tools..." /></label>
          {matchesToolSearch('jwt workbench jws jwe security') && <p className="nav-caption">SECURITY</p>}
          {matchesToolSearch('jwt workbench jws jwe security') && <button className={`nav-item nav-item-jwt ${section === 'jwt' ? 'active' : ''}`} onClick={() => navigate('jwt')}><span className="nav-icon"><ShieldCheck size={17} /></span><span className="nav-item-copy"><b>JWT Workbench</b></span></button>}
          {matchesToolSearch('base64 base128 encoding text') && <><p className="nav-caption nav-caption-spaced">ENCODING</p><button className={`nav-item nav-item-base64 ${section === 'base64' ? 'active' : ''}`} onClick={() => navigate('base64')}><span className="nav-icon"><ArrowUpDown size={17} /></span><span className="nav-item-copy"><b>Base64 / 128</b></span></button></>}
          {matchesToolSearch('json studio formatter validator minifier') && <><p className="nav-caption nav-caption-spaced">FORMATTING</p><button className={`nav-item nav-item-json ${section === 'json' ? 'active' : ''}`} onClick={() => navigate('json')}><span className="nav-icon"><Braces size={17} /></span><span className="nav-item-copy"><b>JSON Studio</b></span></button></>}
          {matchesToolSearch('json to java java pojo record model') && <><p className="nav-caption nav-caption-spaced">JAVA</p><button className={`nav-item nav-item-java ${section === 'java' ? 'active' : ''}`} onClick={() => navigate('java')}><span className="nav-icon"><Code2 size={17} /></span><span className="nav-item-copy"><b>JSON to Java</b></span></button></>}
        </nav>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <div className="page-layout">
          <div className="page-primary">
        {section === 'jwt' && <>
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><KeyRound size={12} /></span> Tools <span className="eyebrow-separator">/</span> JWT</div><h1>{isHomepage ? 'JWT Workbench' : jwtMode === 'Decode' ? 'JWT Decoder' : jwtMode === 'Encode & sign' ? 'JWT Encoder' : jwtMode === 'Verify' ? 'JWT Verifier' : jwtMode === 'Encrypt' ? 'JWE Encryptor' : jwtMode === 'Decrypt' ? 'JWE Decryptor' : 'JWT Keys'}</h1><p>{isHomepage ? 'Work with signed and encrypted tokens locally in your browser.' : jwtMode === 'Decode' ? 'Inspect a compact JWT. Decoding does not verify its signature.' : jwtMode === 'Encode & sign' ? 'Create a signed JWS token with a selected algorithm and key.' : jwtMode === 'Verify' ? 'Verify the signature and registered claims. Authorization remains your application’s responsibility.' : jwtMode === 'Encrypt' ? 'Encrypt JSON with RSA-OAEP-256/A256GCM or direct A256GCM.' : jwtMode === 'Decrypt' ? 'Decrypt a JWE with the matching algorithm and key.' : 'Generate supported JWT key material locally.'}</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Example</button></div>
          <div className="jwt-tabs" role="tablist" aria-label="JWT operations">{jwtModes.map((mode) => <button key={mode} id={`jwt-tab-${mode.toLowerCase().replace(/[^a-z]+/g, '-')}`} role="tab" aria-controls="jwt-workbench-panel" aria-selected={jwtMode === mode} tabIndex={jwtMode === mode ? 0 : -1} className={jwtMode === mode ? 'active' : ''} onClick={() => { setJwtMode(mode); setNotice(null); setDecoded(null) }}>{mode === 'Encrypt' || mode === 'Decrypt' ? <LockKeyhole size={14} /> : mode === 'Keys' ? <FileKey2 size={14} /> : null}{mode}</button>)}</div>
          <div className="workbench-grid" id="jwt-workbench-panel" role="tabpanel">
            <section className="editor-column">
              {(jwtMode === 'Decode' || jwtMode === 'Verify' || jwtMode === 'Decrypt') && <div className="field-block token-field"><div className="field-heading"><label htmlFor="jwt-token">{jwtMode === 'Decrypt' ? 'JWE token' : 'Encoded token'}</label><span className="field-meta">{token.trim() ? `${token.trim().length} chars` : 'Paste a compact token'}</span></div><textarea id="jwt-token" className="code-editor token-editor" value={token} onChange={(event) => setToken(event.target.value)} placeholder="eyJhbGciOi..." spellCheck={false} /><div className="field-tools"><button onClick={() => setToken('')}><RotateCcw size={13} /> Clear</button><button onClick={loadExample}><WandSparkles size={13} /> Example token</button><span>JWT: header.payload.signature</span></div></div>}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Encrypt') && <>{jwtMode === 'Encode & sign' && <div className="field-block"><div className="field-heading"><label htmlFor="jwt-header">JOSE header</label><span className="field-meta">JSON</span></div><textarea id="jwt-header" className="code-editor small-editor" value={header} onChange={(event) => setHeader(event.target.value)} spellCheck={false} /></div>}<div className="field-block"><div className="field-heading"><label htmlFor="jwt-payload">{jwtMode === 'Encrypt' ? 'Plaintext payload' : 'JWT payload'}</label><span className="field-meta">JSON</span></div><textarea id="jwt-payload" className="code-editor payload-editor" value={payload} onChange={(event) => setPayload(event.target.value)} spellCheck={false} /></div>{jwtMode === 'Encode & sign' && <div className="claims-strip"><span>Claims quick-add</span>{['exp', 'nbf', 'iss', 'aud'].map((claim) => <button key={claim} onClick={() => { try { const current = JSON.parse(payload); current[claim] = claim === 'exp' ? Math.floor(Date.now() / 1000) + 3600 : claim === 'nbf' ? Math.floor(Date.now() / 1000) : claim === 'iss' ? 'https://issuer.example' : 'java-api'; setPayload(JSON.stringify(current, null, 2)) } catch { setNotice({ tone: 'error', title: 'Invalid payload JSON', detail: 'Fix the payload before adding a claim.' }) } }}>{claim}</button>)}</div>}</>}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Verify' || jwtMode === 'Encrypt' || jwtMode === 'Decrypt') && <div className={`field-block crypto-settings ${advancedJwtOpen ? 'advanced-open' : ''}`}><div className="field-heading"><label htmlFor="jwt-algorithm">{jweMode ? 'Key management / content encryption' : 'Signing algorithm'}</label><span className="field-meta">{jweMode ? 'JWE' : 'JWS'}</span></div><div className="settings-row"><select id="jwt-algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>{(jweMode ? JWE_ALGORITHMS : JWS_ALGORITHMS).map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="text-action advanced-toggle" type="button" aria-expanded={advancedJwtOpen} onClick={() => setAdvancedJwtOpen(!advancedJwtOpen)}><ChevronDown size={13} /> Advanced</button></div>{advancedJwtOpen && jwtMode === 'Verify' && <label className="tolerance-control">Clock tolerance <input type="number" min="0" max="300" value={tolerance} onChange={(event) => setTolerance(event.target.value)} aria-label="Clock tolerance in seconds" /><span>sec</span></label>}<div className="advanced-key-settings"><div className="field-heading key-label"><label htmlFor="jwt-key">{jweMode ? (jwtMode === 'Encrypt' ? (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA public key') : (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA private key')) : algorithm.startsWith('HS') ? 'Shared secret' : jwtMode === 'Verify' ? 'Public key · SPKI' : 'Private key · PKCS#8'}</label><button className="text-action" onClick={() => void generateKey()}><KeyRound size={13} /> Generate key</button></div><textarea id="jwt-key" className={`code-editor key-editor ${secret ? 'key-filled' : ''}`} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={algorithm.startsWith('HS') || algorithm.startsWith('dir') ? 'Paste secret or generate a secure key…' : '-----BEGIN PUBLIC KEY / PRIVATE KEY-----'} spellCheck={false} /><p className="key-hint">{jweMode ? 'A256GCM needs a 32-byte key. RSA mode needs a matching public/private pair.' : algorithm.startsWith('HS') ? 'HMAC uses the same secret to sign and verify. Keep it private.' : 'Asymmetric signatures use a private key to sign and the matching public key to verify.'}</p></div></div>}
              {jwtMode === 'Keys' && <KeyGenerator onGenerate={async (alg) => { setAlgorithm(alg); await generateKey(alg) }} />}
              {jwtMode !== 'Keys' && <div className="run-row"><button className="button button-primary run-button" onClick={() => void runJwt()} disabled={busy}>{busy ? <span className="spinner" /> : jwtMode === 'Verify' ? <ShieldCheck size={16} /> : jwtMode === 'Decrypt' ? <LockKeyhole size={15} /> : <WandSparkles size={15} />}{jwtMode === 'Decode' ? 'Decode token' : jwtMode === 'Encode & sign' ? 'Sign JWT' : jwtMode === 'Verify' ? 'Verify token' : jwtMode === 'Encrypt' ? 'Encrypt payload' : 'Decrypt token'}</button><span className="run-local">Processed privately in this tab</span></div>}
            </section>
            <section className="result-column" aria-live="polite"><div className="result-top"><div><span className="result-overline">RESULT</span><h2>{jwtMode === 'Decode' ? 'Token inspection' : jwtMode === 'Verify' ? 'Verification result' : jwtMode === 'Keys' ? 'Generated material' : 'Output'}</h2></div><button className="icon-button result-copy" aria-label="Copy result" title="Copy result" onClick={() => void copyText(jwtResult || (decoded ? JSON.stringify(decoded, null, 2) : ''))}><Copy size={15} /></button></div>
              {notice && <div className={`notice notice-${notice.tone}`}><span className="notice-icon">{notice.tone === 'success' ? <Check size={15} /> : notice.tone === 'error' ? <X size={15} /> : <CircleHelp size={15} />}</span><div><b>{notice.title}</b><p>{notice.detail}</p></div></div>}
              {decoded ? <div className="decoded-panels"><JsonPanel title="HEADER" value={decoded.header} accent="lime" /><JsonPanel title="PAYLOAD" value={decoded.payload} accent="blue" /><div className="signature-panel"><div className="json-panel-heading"><span className="signature-dot" />SIGNATURE <span className="field-meta">{decoded.signature.length} chars</span></div><code>{decoded.signature || '(empty)'}</code></div></div> : jwtResult ? <div className="output-box"><div className="output-format"><span className="output-dot" />{jwtMode === 'Keys' ? 'KEY MATERIAL' : jwtMode === 'Decrypt' ? 'PLAINTEXT' : 'COMPACT TOKEN'}<button onClick={() => void copyText(jwtResult)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><pre>{jwtResult}</pre></div> : <div className="empty-result"><div className="empty-graphic"><span className="empty-bracket">{'{ }'}</span><span className="empty-lock"><LockKeyhole size={18} /></span></div><b>Ready when you are</b><p>{jwtMode === 'Decode' ? 'Paste a JWT above to inspect its header and payload.' : jwtMode === 'Verify' ? 'Add a token and verification key to validate this JWT.' : jwtMode === 'Encrypt' ? 'Add a payload and key, then encrypt in this tab.' : jwtMode === 'Decrypt' ? 'Paste a JWE and provide its matching decryption key.' : 'Generate a secure key for supported JWT workflows.'}</p><span className="empty-local">Your data stays private</span></div>}
              <div className="result-foot"><span><LockKeyhole size={12} /> No data leaves this browser</span><span>{decoded ? 'JWT · COMPACT SERIALIZATION' : 'READY'}</span></div>
            </section>
          </div>
          <div className="privacy-callout"><LockKeyhole size={14} /><span>Processed in this browser. Inputs are not uploaded or saved.</span></div>
        </>}

        {section === 'json' && <>
          <div className="page-heading converter-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><Braces size={12} /></span> DEVELOPER TOOLS <span className="eyebrow-separator">/</span> JSON</div><h1>JSON tools</h1><p>Format, minify, or validate JSON locally in your browser.</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <section className="converter-workspace json-workspace"><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon"><Braces size={17} /></span><div><b>JSON formatter & validator</b><small>Private processing · your input stays in this tab</small></div></div><div className="json-mode-tabs" role="tablist" aria-label="JSON operation">{(['format', 'minify', 'validate'] as const).map((mode) => <button key={mode} role="tab" aria-selected={jsonMode === mode} className={jsonMode === mode ? 'active' : ''} onClick={() => { setJsonMode(mode); setConverterOutput(''); setConverterError('') }}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor="converter-input">JSON INPUT</label><button onClick={() => { setConverterInput(''); setConverterOutput(''); setConverterError('') }}><X size={13} /> Clear</button></div><textarea id="converter-input" className="code-editor converter-editor" value={converterInput} onChange={(event) => setConverterInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void runConverter() } }} placeholder="Paste JSON here…" spellCheck={false} /><div className="pane-footer"><span>{converterInput.length} characters</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={() => void runConverter()} aria-label={`Run JSON ${jsonMode}`}><ArrowLeftRight size={17} /></button><button className="convert-text-button" onClick={() => void runConverter()}>{jsonMode === 'format' ? 'Format JSON' : jsonMode === 'minify' ? 'Minify JSON' : 'Validate JSON'} <span>Ctrl / ⌘ ↵</span></button></div>
              <div className="converter-pane output-pane" aria-live="polite"><div className="pane-heading"><span>{jsonMode === 'validate' ? 'VALIDATION' : 'OUTPUT'}</span><button disabled={!converterOutput} onClick={() => void copyText(converterOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>{converterError ? <div className="converter-error" role="alert"><X size={15} />{converterError}</div> : converterOutput ? <pre className={`code-editor converter-output ${jsonMode === 'validate' ? 'validation-output' : ''}`}>{converterOutput}</pre> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>{jsonMode === 'validate' ? 'JSON validity will be reported here' : 'Your input is processed locally'}</small></div>}<div className="pane-footer"><span>{converterOutput ? `${converterOutput.length} characters` : 'Waiting for input'}</span><button onClick={() => setConverterOutput('')}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
        </>}
        {section === 'java' && <>
          <div className="page-heading converter-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><Code2 size={12} /></span> BACKEND WORKFLOWS <span className="eyebrow-separator">/</span> JAVA</div><h1>JSON to Java models</h1><p>Generate nested Java records or POJOs from a JSON object, entirely in your browser.</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <section className="converter-workspace json-workspace java-workspace">
            <div className="converter-toolbar java-toolbar">
              <div className="converter-title"><span className="converter-title-icon"><Code2 size={17} /></span><div><b>Java model generator</b><small>Private processing · your input stays in this tab</small></div></div>
              <div className="java-controls">
                <label htmlFor="java-class-name">Root class <input id="java-class-name" className="java-class-input" value={javaClassName} onChange={(event) => { setJavaClassName(event.target.value); setJavaOutput(''); setJavaError('') }} /></label>
                <div className="json-mode-tabs" role="tablist" aria-label="Java model style">
                  {(['record', 'pojo'] as const).map((style) => <button key={style} role="tab" aria-selected={javaStyle === style} className={javaStyle === style ? 'active' : ''} onClick={() => { setJavaStyle(style); setJavaOutput(''); setJavaError('') }}>{style === 'record' ? 'Record' : 'POJO'}</button>)}
                </div>
              </div>
            </div>
            <div className="converter-editors">
              <div className="converter-pane">
                <div className="pane-heading"><label htmlFor="java-json-input">JSON INPUT</label><button onClick={() => { setJavaInput(''); setJavaOutput(''); setJavaError('') }}><X size={13} /> Clear</button></div>
                <textarea id="java-json-input" className="code-editor converter-editor" value={javaInput} onChange={(event) => setJavaInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runJavaModel() } }} placeholder="Paste a JSON object here…" spellCheck={false} />
                <div className="pane-footer"><span>{javaInput.length} characters</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div>
              </div>
              <div className="converter-actions"><button className="convert-button" onClick={runJavaModel} aria-label="Generate Java model"><ArrowLeftRight size={17} /></button><button className="convert-text-button" onClick={runJavaModel}>Generate Java <span>Ctrl / ⌘ ↵</span></button></div>
              <div className="converter-pane output-pane" aria-live="polite">
                <div className="pane-heading"><span>JAVA SOURCE</span><button disabled={!javaOutput} onClick={() => void copyText(javaOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>
                {javaError ? <div className="converter-error" role="alert"><X size={15} />{javaError}</div> : javaOutput ? <pre className="code-editor converter-output java-output" tabIndex={0} aria-label="Generated Java source">{javaOutput}</pre> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Java source appears here</b><small>Paste a JSON object and generate a model</small></div>}
                <div className="pane-footer"><span>{javaOutput ? `${javaOutput.length} characters` : 'Waiting for input'}</span><button onClick={() => { setJavaOutput(''); setJavaError('') }}><RotateCcw size={12} /> Reset</button></div>
              </div>
            </div>
          </section>
          <div className="java-note"><CircleHelp size={15} /><span><b>Output notes.</b> Nullable fields use reference types; empty or mixed values use <code>Object</code>. Records require Java 16 or newer. Renamed JSON keys add Jackson <code>@JsonProperty</code> annotations and require <code>jackson-annotations</code>.</span></div>
        </>}
        {section === 'base64' && <>
          <div className="page-heading converter-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><ArrowUpDown size={12} /></span> TEXT TOOLS <span className="eyebrow-separator">/</span> ENCODING</div><h1>{encodingFormat === 'base64' ? 'Base64 converter' : 'Base128 converter'}</h1><p>{encodingFormat === 'base64' ? 'Encode or decode UTF-8 text with standard Base64.' : 'Encode or decode UTF-8 text with JStack’s custom printable 7-bit format.'}</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <div className="encoding-format-switch" role="tablist" aria-label="Encoding format">
            <button role="tab" aria-selected={encodingFormat === 'base64'} className={encodingFormat === 'base64' ? 'active' : ''} onClick={() => setEncodingFormat('base64')}><span className="encoding-format-icon"><ArrowUpDown size={17} /></span><span><b>Base64</b><small>Standard format</small></span></button>
            <button role="tab" aria-selected={encodingFormat === 'base128'} className={encodingFormat === 'base128' ? 'active' : ''} onClick={() => setEncodingFormat('base128')}><span className="encoding-format-icon"><Binary size={17} /></span><span><b>Base128</b><small>JStack custom</small></span></button>
          </div>
          <section className="converter-workspace json-workspace"><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon">{encodingFormat === 'base64' ? <ArrowUpDown size={17} /> : <Binary size={17} />}</span><div><b>{encodingFormat === 'base64' ? 'Base64 text converter' : 'Base128 converter'}</b><small>Private processing · your input stays in this tab</small></div></div><div className="json-mode-tabs" role="tablist" aria-label={`${encodingFormat} operation`}>{(['encode', 'decode'] as const).map((mode) => <button key={mode} role="tab" aria-selected={encodingMode === mode} className={encodingMode === mode ? 'active' : ''} onClick={() => setEncodingMode(mode)}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor={encodingFormat === 'base64' ? 'base64-input' : 'base128-input'}>{encodingMode === 'encode' ? 'PLAIN TEXT' : `${encodingFormat.toUpperCase()} INPUT`}</label><button onClick={clearEncoding}><X size={13} /> Clear</button></div><textarea id={encodingFormat === 'base64' ? 'base64-input' : 'base128-input'} className="code-editor converter-editor" value={encodingInput} onChange={(event) => setEncodingInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runEncoding() } }} placeholder={encodingMode === 'encode' ? 'Type or paste plain text…' : encodingFormat === 'base64' ? 'Paste standard Base64…' : 'Paste JStack Base128 Braille text…'} spellCheck={false} /><div className="pane-footer"><span>{encodingInput.length} characters</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={runEncoding} aria-label={`Run ${encodingFormat} ${encodingMode}`}><ArrowLeftRight size={17} /></button><button className="convert-text-button" onClick={runEncoding}>{encodingMode === 'encode' ? `Encode to ${encodingFormat === 'base64' ? 'Base64' : 'Base128'}` : `Decode ${encodingFormat === 'base64' ? 'Base64' : 'Base128'}`} <span>Ctrl / ⌘ ↵</span></button></div>
              <div className="converter-pane output-pane"><div className="pane-heading"><span>OUTPUT</span><button disabled={!encodingOutput} onClick={() => void copyText(encodingOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>{encodingError ? <div className="converter-error"><X size={15} />{encodingError}</div> : encodingOutput ? <pre className="code-editor converter-output">{encodingOutput}</pre> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>{encodingFormat === 'base64' ? 'Standard Base64 output' : 'JStack’s printable Braille alphabet'}</small></div>}<div className="pane-footer"><span>{encodingOutput ? `${encodingOutput.length} characters` : 'Waiting for input'}</span><button onClick={resetEncodingOutput}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
          {encodingFormat === 'base128' && <div className="java-note date-note"><CircleHelp size={15} /><span>JStack Base128 is custom, not a universal standard. Use it only with a decoder using the same mapping (U+2801–U+2880).</span></div>}
        </>}
        {section === 'about' && <AboutPage onHome={() => navigate('jwt')} />}
        <footer className="page-footer"><span>JSTACK <i>·</i> DEVELOPER TOOLS</span><div><a href="/guide">Guide</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer>
          </div>
        </div>
      </main>
    </div>
  </div>
}

function JsonPanel({ title, value, accent }: { title: string; value: Record<string, unknown>; accent: 'lime' | 'blue' }) {
  return <div className={`json-panel json-${accent}`}><div className="json-panel-heading"><span className="json-dot" />{title}<span className="field-meta">JSON</span><button aria-label={`Copy ${title.toLowerCase()}`} onClick={() => void navigator.clipboard.writeText(JSON.stringify(value, null, 2))}><Copy size={12} /></button></div><pre>{JSON.stringify(value, null, 2)}</pre></div>
}

function KeyGenerator({ onGenerate }: { onGenerate: (algorithm: string) => Promise<void> }) {
  const [keyType, setKeyType] = useState('HS256')
  const [status, setStatus] = useState('')
  const generate = async () => { setStatus('Generating securely…'); try { await onGenerate(keyType); setStatus('Key material added to the output panel.') } catch (error) { setStatus(error instanceof Error ? error.message : 'Key generation failed.') } }
  return <div className="key-generator-card"><div className="key-generator-top"><span className="generator-icon"><FileKey2 size={20} /></span><div><h3>Key generation</h3><p>Create algorithm-compatible material using Web Crypto in this browser.</p></div></div><label htmlFor="key-type">Key type and algorithm</label><select id="key-type" value={keyType} onChange={(event) => setKeyType(event.target.value)}><optgroup label="Symmetric"><option value="HS256">HMAC SHA-256 · 256-bit secret</option><option value="HS512">HMAC SHA-512 · 256-bit secret</option><option value="dir/A256GCM">AES-GCM · 256-bit JWE key</option></optgroup><optgroup label="Asymmetric"><option value="RS256">RSA 2048 · RS256</option><option value="PS256">RSA 2048 · PS256</option><option value="ES256">ECDSA P-256 · ES256</option><option value="RSA-OAEP-256/A256GCM">RSA 2048 · JWE</option></optgroup></select><div className="key-generator-facts"><span><Check size={13} /> Browser generated</span><span><Check size={13} /> Private key never uploaded</span><span><Check size={13} /> PEM / Base64URL output</span></div><button className="button button-primary" onClick={() => void generate()}><KeyRound size={15} /> Generate key material</button>{status && <p className="key-status">{status}</p>}</div>
}

function AboutPage({ onHome }: { onHome: () => void }) {
  return <div className="info-page about-page">
    <div className="eyebrow"><span className="eyebrow-mark"><BookOpenText size={12} /></span> ABOUT JSTACK</div>
    <h1>Java developer tools for everyday backend work.</h1>
    <p className="info-intro">JStack brings practical JWT, JSON, Java model, and text-encoding tools together in one easy-to-use workspace.</p>
    <div className="about-grid">
      <article><span><ShieldCheck size={17} /></span><h2>JWT and JWE tools</h2><p><a href="/jwt-decoder">Decode JWTs</a>, sign and verify JWS tokens, or encrypt supported JWE formats. Decoding reveals content; it does not verify a token or authorize access.</p></article>
      <article><span><Braces size={17} /></span><h2>JSON and Java</h2><p><a href="/json-formatter">Format JSON</a>, check its syntax, or <a href="/json-to-java">generate Java records and POJOs</a> from an example object. Generated types are an inference, not a schema.</p></article>
      <article><span><ArrowUpDown size={17} /></span><h2>Text encoders</h2><p>Convert UTF-8 text with <a href="/base64-converter">standard Base64</a> or JStack’s custom Base128 format. Base64 is not encryption, and Base128 is not a universal standard.</p></article>
      <article><span><LockKeyhole size={17} /></span><h2>Privacy and safety</h2><p>Tool inputs are processed in this browser and are not sent to a JStack application backend or stored. Your theme preference is saved locally. <a href="/privacy.html">Read the privacy policy</a>.</p></article>
    </div>
    <div className="policy-disclaimer"><b>Need help?</b><p>See the <a href="/guide.html">developer guide</a> for security basics and common error fixes, or <a href="/contact.html">contact JStack</a>. Never send production tokens, passwords, or private keys.</p></div>
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