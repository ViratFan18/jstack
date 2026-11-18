import { useEffect, useState } from 'react'
import {
  ArrowLeftRight, ArrowUpDown, BookOpenText, Braces, Check, CircleHelp, Code2, Copy,
  FileKey2, KeyRound, LockKeyhole, Menu, Moon, RotateCcw, ShieldCheck, Sun,
  TerminalSquare, WandSparkles, X,
} from 'lucide-react'
import { JWE_ALGORITHMS, JWS_ALGORITHMS } from './lib/jwt-constants'
import './App.css'

type Section = 'jwt' | 'json' | 'base64' | 'about'
type JwtMode = 'Decode' | 'Encode & sign' | 'Verify' | 'Encrypt' | 'Decrypt' | 'Keys'
type JsonMode = 'format' | 'minify' | 'validate'
type Base64Mode = 'encode' | 'decode'
type Notice = { tone: 'success' | 'warning' | 'error'; title: string; detail: string }

const jwtModes: JwtMode[] = ['Decode', 'Encode & sign', 'Verify', 'Encrypt', 'Decrypt', 'Keys']
const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqYXZhLWRldiIsInJvbGUiOiJlbmdpbmVlciIsImlhdCI6MTcwNDA2NzIwMH0.c2FtcGxlLXNpZ25hdHVyZQ'

function App() {
  const [section, setSection] = useState<Section>('jwt')
  const [jwtMode, setJwtMode] = useState<JwtMode>('Decode')
  const [jsonMode, setJsonMode] = useState<JsonMode>('format')
  const [base64Mode, setBase64Mode] = useState<Base64Mode>('encode')
  const [darkMode, setDarkMode] = useState(true)
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
  const [base64Input, setBase64Input] = useState('Java developers, welcome!')
  const [base64Output, setBase64Output] = useState('')
  const [base64Error, setBase64Error] = useState('')
  const [copied, setCopied] = useState(false)
  const jweMode = jwtMode === 'Encrypt' || jwtMode === 'Decrypt'

  useEffect(() => { document.documentElement.dataset.theme = darkMode ? 'dark' : 'light' }, [darkMode])
  useEffect(() => {
    const titles: Record<Section, string> = { jwt: 'JWT Workbench', json: 'JSON Tools', base64: 'Base64 Tools', about: 'About' }
    document.title = `${titles[section]} · JStack`
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = new URL('/', import.meta.env.VITE_SITE_URL || window.location.origin).href
  }, [section])

  const navigate = (next: Section) => { setSection(next); setSidebarOpen(false) }
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

  const copyText = async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true); window.setTimeout(() => setCopied(false), 1400)
  }

  const loadExample = () => {
    if (section === 'jwt') { setToken(sampleJwt); setJwtMode('Decode'); return }
    if (section === 'base64') {
      setBase64Input(base64Mode === 'encode' ? 'Java developers, welcome!' : 'SGVsbG8gV29ybGQh')
      setBase64Output('')
      setBase64Error('')
      return
    }
    setConverterInput('{\n  "id": 42,\n  "displayName": "Ada Lovelace",\n  "active": true,\n  "roles": ["admin", "author"]\n}')
    setConverterOutput('')
    setConverterError('')
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={19} /></button>
      <button className="brand" onClick={() => navigate('jwt')} aria-label="JStack home"><span className="brand-mark"><Code2 size={18} /></span><span>jstack<span className="brand-dot">.</span></span></button>
      <div className="topbar-divider" /><div className="product-label">Developer tools <span className="version-chip">BETA</span></div>
      <div className="topbar-actions"><button className="icon-button theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle color theme">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button></div>
    </header>
    <div className="app-body">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline"><span>WORKSPACE</span><span className="sidebar-activity"><i /> LIVE</span></div>
        <nav aria-label="Main navigation">
          <p className="nav-caption">TOKEN TOOLS</p>
          <button className={`nav-item ${section === 'jwt' ? 'active' : ''}`} onClick={() => navigate('jwt')}><ShieldCheck size={17} /><span>JWT workbench</span><span className="nav-hotkey">01</span></button>
          <p className="nav-caption nav-caption-spaced">TEXT TOOLS</p>
          <button className={`nav-item ${section === 'base64' ? 'active' : ''}`} onClick={() => navigate('base64')}><ArrowUpDown size={17} /><span>Base64 encode / decode</span></button>
          <p className="nav-caption nav-caption-spaced">JAVA TOOLKIT</p>
          <button className={`nav-item ${section === 'json' ? 'active' : ''}`} onClick={() => navigate('json')}><Braces size={17} /><span>JSON tools</span><span className="nav-count">03</span></button>
          <button className={`nav-item ${section === 'about' ? 'active' : ''}`} onClick={() => navigate('about')}><BookOpenText size={17} /><span>About & policies</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="privacy-mini"><LockKeyhole size={15} /><span><b>Private by design</b><small>Your inputs stay in this browser.</small></span></div><div className="sidebar-foot">JSTACK TOOLKIT <span>v1.0</span></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        {section === 'jwt' && <>
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><KeyRound size={12} /></span> TOKEN WORKSPACE <span className="eyebrow-separator">/</span> JWS + JWE</div><h1>JWT workbench</h1><p>Inspect, sign, verify and encrypt tokens without sending them anywhere.</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <div className="jwt-tabs" role="tablist" aria-label="JWT operations">{jwtModes.map((mode) => <button key={mode} role="tab" aria-selected={jwtMode === mode} className={jwtMode === mode ? 'active' : ''} onClick={() => { setJwtMode(mode); setNotice(null); setDecoded(null) }}>{mode === 'Encrypt' || mode === 'Decrypt' ? <LockKeyhole size={14} /> : mode === 'Keys' ? <FileKey2 size={14} /> : null}{mode}</button>)}</div>
          <div className="privacy-callout"><LockKeyhole size={15} /><span><b>Local processing.</b> Tokens, keys and payloads stay in this tab and are never uploaded or stored.</span><button title="Operations are performed in your browser." aria-label="About local processing"><CircleHelp size={15} /></button></div>
          <div className="workbench-grid">
            <section className="editor-column">
              {(jwtMode === 'Decode' || jwtMode === 'Verify' || jwtMode === 'Decrypt') && <div className="field-block token-field"><div className="field-heading"><label htmlFor="jwt-token">{jwtMode === 'Decrypt' ? 'JWE token' : 'Encoded token'}</label><span className="field-meta">{token.trim() ? `${token.trim().length} chars` : 'Paste a compact token'}</span></div><textarea id="jwt-token" className="code-editor token-editor" value={token} onChange={(event) => setToken(event.target.value)} placeholder="eyJhbGciOi..." spellCheck={false} /><div className="field-tools"><button onClick={() => setToken('')}><RotateCcw size={13} /> Clear</button><button onClick={loadExample}><WandSparkles size={13} /> Example token</button><span>JWT: header.payload.signature</span></div></div>}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Encrypt') && <>{jwtMode === 'Encode & sign' && <div className="field-block"><div className="field-heading"><label htmlFor="jwt-header">JOSE header</label><span className="field-meta">JSON</span></div><textarea id="jwt-header" className="code-editor small-editor" value={header} onChange={(event) => setHeader(event.target.value)} spellCheck={false} /></div>}<div className="field-block"><div className="field-heading"><label htmlFor="jwt-payload">{jwtMode === 'Encrypt' ? 'Plaintext payload' : 'JWT payload'}</label><span className="field-meta">JSON</span></div><textarea id="jwt-payload" className="code-editor payload-editor" value={payload} onChange={(event) => setPayload(event.target.value)} spellCheck={false} /></div>{jwtMode === 'Encode & sign' && <div className="claims-strip"><span>Claims quick-add</span>{['exp', 'nbf', 'iss', 'aud'].map((claim) => <button key={claim} onClick={() => { try { const current = JSON.parse(payload); current[claim] = claim === 'exp' ? Math.floor(Date.now() / 1000) + 3600 : claim === 'nbf' ? Math.floor(Date.now() / 1000) : claim === 'iss' ? 'https://issuer.example' : 'java-api'; setPayload(JSON.stringify(current, null, 2)) } catch { setNotice({ tone: 'error', title: 'Invalid payload JSON', detail: 'Fix the payload before adding a claim.' }) } }}>{claim}</button>)}</div>}</>}
              {(jwtMode === 'Encode & sign' || jwtMode === 'Verify' || jwtMode === 'Encrypt' || jwtMode === 'Decrypt') && <div className="field-block crypto-settings"><div className="field-heading"><label htmlFor="jwt-algorithm">{jweMode ? 'Key management / content encryption' : 'Signing algorithm'}</label><span className="field-meta">{jweMode ? 'JWE' : 'JWS'}</span></div><div className="settings-row"><select id="jwt-algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>{(jweMode ? JWE_ALGORITHMS : JWS_ALGORITHMS).map((item) => <option key={item} value={item}>{item}</option>)}</select>{jwtMode === 'Verify' && <label className="tolerance-control">Clock tolerance <input type="number" min="0" max="300" value={tolerance} onChange={(event) => setTolerance(event.target.value)} aria-label="Clock tolerance in seconds" /><span>sec</span></label>}</div><div className="field-heading key-label"><label htmlFor="jwt-key">{jweMode ? (jwtMode === 'Encrypt' ? (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA public key') : (algorithm.startsWith('dir') ? '256-bit shared key' : 'RSA private key')) : algorithm.startsWith('HS') ? 'Shared secret' : jwtMode === 'Verify' ? 'Public key · SPKI' : 'Private key · PKCS#8'}</label><button className="text-action" onClick={() => void generateKey()}><KeyRound size={13} /> Generate key</button></div><textarea id="jwt-key" className={`code-editor key-editor ${secret ? 'key-filled' : ''}`} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={algorithm.startsWith('HS') || algorithm.startsWith('dir') ? 'Paste secret or generate a secure key…' : '-----BEGIN PUBLIC KEY / PRIVATE KEY-----'} spellCheck={false} /><p className="key-hint">{jweMode ? 'A256GCM needs a 32-byte key. RSA mode needs a matching public/private pair.' : algorithm.startsWith('HS') ? 'HMAC uses the same secret to sign and verify. Keep it private.' : 'Asymmetric signatures use a private key to sign and the matching public key to verify.'}</p></div>}
              {jwtMode === 'Keys' && <KeyGenerator onGenerate={async (alg) => { setAlgorithm(alg); await generateKey(alg) }} />}
              {jwtMode !== 'Keys' && <div className="run-row"><button className="button button-primary run-button" onClick={() => void runJwt()} disabled={busy}>{busy ? <span className="spinner" /> : jwtMode === 'Verify' ? <ShieldCheck size={16} /> : jwtMode === 'Decrypt' ? <LockKeyhole size={15} /> : <WandSparkles size={15} />}{jwtMode === 'Decode' ? 'Decode token' : jwtMode === 'Encode & sign' ? 'Sign JWT' : jwtMode === 'Verify' ? 'Verify token' : jwtMode === 'Encrypt' ? 'Encrypt payload' : 'Decrypt token'}</button><span className="run-local"><span /> Runs in your browser</span></div>}
            </section>
            <section className="result-column" aria-live="polite"><div className="result-top"><div><span className="result-overline">RESULT</span><h2>{jwtMode === 'Decode' ? 'Token inspection' : jwtMode === 'Verify' ? 'Verification result' : jwtMode === 'Keys' ? 'Generated material' : 'Output'}</h2></div><button className="icon-button result-copy" aria-label="Copy result" title="Copy result" onClick={() => void copyText(jwtResult || (decoded ? JSON.stringify(decoded, null, 2) : ''))}><Copy size={15} /></button></div>
              {notice && <div className={`notice notice-${notice.tone}`}><span className="notice-icon">{notice.tone === 'success' ? <Check size={15} /> : notice.tone === 'error' ? <X size={15} /> : <CircleHelp size={15} />}</span><div><b>{notice.title}</b><p>{notice.detail}</p></div></div>}
              {decoded ? <div className="decoded-panels"><JsonPanel title="HEADER" value={decoded.header} accent="lime" /><JsonPanel title="PAYLOAD" value={decoded.payload} accent="blue" /><div className="signature-panel"><div className="json-panel-heading"><span className="signature-dot" />SIGNATURE <span className="field-meta">{decoded.signature.length} chars</span></div><code>{decoded.signature || '(empty)'}</code></div></div> : jwtResult ? <div className="output-box"><div className="output-format"><span className="output-dot" />{jwtMode === 'Keys' ? 'KEY MATERIAL' : jwtMode === 'Decrypt' ? 'PLAINTEXT' : 'COMPACT TOKEN'}<button onClick={() => void copyText(jwtResult)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><pre>{jwtResult}</pre></div> : <div className="empty-result"><div className="empty-graphic"><span className="empty-bracket">{'{ }'}</span><span className="empty-lock"><LockKeyhole size={18} /></span></div><b>Ready when you are</b><p>{jwtMode === 'Decode' ? 'Paste a JWT above to inspect its header and payload.' : jwtMode === 'Verify' ? 'Add a token and verification key to validate this JWT.' : jwtMode === 'Encrypt' ? 'Add a payload and key, then encrypt locally.' : jwtMode === 'Decrypt' ? 'Paste a JWE and provide its matching decryption key.' : 'Generate a secure key for supported JWT workflows.'}</p><span className="empty-local"><i /> LOCAL ONLY</span></div>}
              <div className="result-foot"><span><LockKeyhole size={12} /> No data leaves this browser</span><span>{decoded ? 'JWT · COMPACT SERIALIZATION' : 'READY'}</span></div>
            </section>
          </div>
          <section className="concept-band"><div><span className="concept-icon"><Braces size={16} /></span><b>Encoding is not encryption</b><p>JWT parts use Base64URL. JWS adds a signature; JWE encrypts content.</p></div><div><span className="concept-icon coral"><ShieldCheck size={16} /></span><b>Verification ≠ authorization</b><p>Check claims and access rules even after signature verification.</p></div><div className="concept-link"><button onClick={() => navigate('about')}>Security notes <span>↗</span></button><small>Understand algorithms and key formats</small></div></section>
        </>}

        {section === 'json' && <>
          <div className="page-heading converter-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><Braces size={12} /></span> DEVELOPER TOOLS <span className="eyebrow-separator">/</span> JSON</div><h1>JSON tools</h1><p>Format, minify, or validate JSON locally in your browser.</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <section className="converter-workspace json-workspace"><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon"><Braces size={17} /></span><div><b>JSON formatter & validator</b><small>Client-side · no data uploaded</small></div></div><div className="json-mode-tabs" role="tablist" aria-label="JSON operation">{(['format', 'minify', 'validate'] as const).map((mode) => <button key={mode} role="tab" aria-selected={jsonMode === mode} className={jsonMode === mode ? 'active' : ''} onClick={() => { setJsonMode(mode); setConverterOutput(''); setConverterError('') }}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor="converter-input">JSON INPUT</label><button onClick={() => { setConverterInput(''); setConverterOutput(''); setConverterError('') }}><X size={13} /> Clear</button></div><textarea id="converter-input" className="code-editor converter-editor" value={converterInput} onChange={(event) => setConverterInput(event.target.value)} placeholder="Paste JSON here…" spellCheck={false} /><div className="pane-footer"><span>{converterInput.length} characters</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={() => void runConverter()} aria-label={`Run JSON ${jsonMode}`}><ArrowLeftRight size={17} /></button><button className="convert-text-button" onClick={() => void runConverter()}>{jsonMode === 'format' ? 'Format JSON' : jsonMode === 'minify' ? 'Minify JSON' : 'Validate JSON'} <span>⌘ ↵</span></button></div>
              <div className="converter-pane output-pane"><div className="pane-heading"><span>{jsonMode === 'validate' ? 'VALIDATION' : 'OUTPUT'}</span><button disabled={!converterOutput} onClick={() => void copyText(converterOutput)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>{converterError ? <div className="converter-error"><X size={15} />{converterError}</div> : converterOutput ? <pre className={`code-editor converter-output ${jsonMode === 'validate' ? 'validation-output' : ''}`}>{converterOutput}</pre> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>{jsonMode === 'validate' ? 'JSON validity will be reported here' : 'Your input is processed locally'}</small></div>}<div className="pane-footer"><span>{converterOutput ? `${converterOutput.length} characters` : 'Waiting for input'}</span><button onClick={() => setConverterOutput('')}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
        </>}
        {section === 'base64' && <>
          <div className="page-heading converter-heading"><div><div className="eyebrow"><span className="eyebrow-mark"><ArrowUpDown size={12} /></span> TEXT TOOLS <span className="eyebrow-separator">/</span> BASE64</div><h1>Base64 encode & decode</h1><p>Convert plain UTF-8 text to standard Base64 and back. This is encoding, not encryption.</p></div><button className="button button-secondary sample-button" onClick={loadExample}><WandSparkles size={15} /> Load example</button></div>
          <section className="converter-workspace json-workspace"><div className="converter-toolbar"><div className="converter-title"><span className="converter-title-icon"><ArrowUpDown size={17} /></span><div><b>Text Base64 converter</b><small>Client-side · no data uploaded</small></div></div><div className="json-mode-tabs" role="tablist" aria-label="Base64 operation">{(['encode', 'decode'] as const).map((mode) => <button key={mode} role="tab" aria-selected={base64Mode === mode} className={base64Mode === mode ? 'active' : ''} onClick={() => { setBase64Mode(mode); setBase64Output(''); setBase64Error('') }}>{mode}</button>)}</div></div>
            <div className="converter-editors"><div className="converter-pane"><div className="pane-heading"><label htmlFor="base64-input">{base64Mode === 'encode' ? 'PLAIN TEXT' : 'BASE64 INPUT'}</label><button onClick={() => { setBase64Input(''); setBase64Output(''); setBase64Error('') }}><X size={13} /> Clear</button></div><textarea id="base64-input" className="code-editor converter-editor" value={base64Input} onChange={(event) => setBase64Input(event.target.value)} placeholder={base64Mode === 'encode' ? 'Type or paste plain text…' : 'Paste standard Base64…'} spellCheck={false} /><div className="pane-footer"><span>{base64Input.length} characters</span><button onClick={loadExample}><WandSparkles size={12} /> Example</button></div></div>
              <div className="converter-actions"><button className="convert-button" onClick={() => void runBase64()} aria-label={`Run Base64 ${base64Mode}`}><ArrowLeftRight size={17} /></button><button className="convert-text-button" onClick={() => void runBase64()}>{base64Mode === 'encode' ? 'Encode to Base64' : 'Decode Base64'} <span>⌘ ↵</span></button></div>
              <div className="converter-pane output-pane"><div className="pane-heading"><span>OUTPUT</span><button disabled={!base64Output} onClick={() => void copyText(base64Output)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>{base64Error ? <div className="converter-error"><X size={15} />{base64Error}</div> : base64Output ? <pre className="code-editor converter-output">{base64Output}</pre> : <div className="output-placeholder"><span><TerminalSquare size={18} /></span><b>Output appears here</b><small>Plain text and standard Base64 only</small></div>}<div className="pane-footer"><span>{base64Output ? `${base64Output.length} characters` : 'Waiting for input'}</span><button onClick={() => setBase64Output('')}><RotateCcw size={12} /> Reset</button></div></div></div>
          </section>
        </>}
        {section === 'about' && <AboutPage onHome={() => navigate('jwt')} />}
        <footer className="page-footer"><span>JSTACK <i>·</i> DEVELOPER TOOLS</span><div><a href="/guide.html">Guide</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></div></footer>
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
  return <div className="info-page about-page"><div className="eyebrow"><span className="eyebrow-mark"><BookOpenText size={12} /></span> ABOUT <span className="eyebrow-separator">/</span> PRIVACY</div><h1>JWT and data tools for developers.</h1><p className="info-intro">JStack brings a JWT/JWE workbench, JSON formatter/minifier/validator, and standard Base64 text converter together in one browser-based workspace.</p><div className="about-grid"><article><span><LockKeyhole size={17} /></span><h2>Privacy</h2><p>Tool inputs are processed in your browser and are not sent to a JStack application backend or stored in local storage. The hosting provider still processes normal web requests. <a href="/privacy.html">Read the privacy policy</a></p></article><article><span><ShieldCheck size={17} /></span><h2>JWT security</h2><p>Decoding only reveals content; it does not verify signatures. Verification does not make an authorization decision. A signed JWT is not encrypted.</p></article><article><span><Braces size={17} /></span><h2>Data formats</h2><p>JSON validation checks syntax, not a schema. Standard Base64 encodes text and is not encryption. Base64URL is a separate format. <a href="/guide.html">Read the developer guide</a></p></article><article><span><CircleHelp size={17} /></span><h2>Contact</h2><p><a href="mailto:shaikmukhuran@gmail.com">shaikmukhuran@gmail.com</a><br /><a href="tel:+17207521486">720-752-1486</a></p></article></div><div className="policy-disclaimer"><b>Contact and legal information</b><p>Review the <a href="/terms.html">Terms of Use</a> and <a href="/privacy.html">Privacy Policy</a> for the hosting and data practices that apply to the deployed site.</p></div><button className="button button-secondary back-tool" onClick={onHome}><ArrowLeftRight size={14} /> Tool workspace</button></div>
}

export default App