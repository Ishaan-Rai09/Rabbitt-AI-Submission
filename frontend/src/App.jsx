import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://rabbitt-ai-submission.onrender.com'

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 14, startDelay = 0) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!text) { setDisplayed(''); return }
    let idx = 0
    setDisplayed('')
    let interval = null
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        idx++
        setDisplayed(text.slice(0, idx))
        if (idx >= text.length) clearInterval(interval)
      }, speed)
    }, startDelay)
    return () => { clearTimeout(timeout); if (interval) clearInterval(interval) }
  }, [text, speed, startDelay])
  return displayed
}

// ── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, duration = 600) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 6.5H11M11 6.5L7 2.5M11 6.5L7 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCheck = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 8.5H3A1.5 1.5 0 0 1 1.5 7V3A1.5 1.5 0 0 1 3 1.5H7A1.5 1.5 0 0 1 8.5 3V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M8 1.5L3 8H7L6 12.5L11 6H7L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
  </svg>
)
const IconSignal = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M1 9 Q3 5 6 5 Q9 5 11 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M3 9 Q4.5 6.5 6 6.5 Q7.5 6.5 9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <circle cx="6" cy="9" r="1" fill="currentColor"/>
  </svg>
)
const IconTerminal = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 3L4.5 6L1.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

// ── Typography ────────────────────────────────────────────────────────────────
function Mono({ children, className = '' }) {
  return (
    <span className={`font-mono text-[11px] uppercase tracking-widest ${className}`}>
      {children}
    </span>
  )
}

function FieldLabel({ n, children }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="font-mono text-[10px] text-orange-500 select-none tabular-nums w-4">
        {String(n).padStart(2, '0')}
      </span>
      <Mono className="text-zinc-400">{children}</Mono>
    </div>
  )
}

// ── Dot status indicator ──────────────────────────────────────────────────────
function Dot({ color = 'green', pulse = false, size = 'sm' }) {
  const colors = {
    green:  'bg-green-500',
    orange: 'bg-orange-500',
    red:    'bg-red-500',
    zinc:   'bg-zinc-600',
  }
  const sizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2' }
  return (
    <span className={`inline-block rounded-full shrink-0 ${colors[color]} ${sizes[size]} ${pulse ? 'animate-pulse' : ''}`} />
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, variant = 'default' }) {
  const v = {
    default: 'text-zinc-500 bg-transparent border-zinc-800',
    orange:  'text-orange-400 bg-orange-500/10 border-orange-500/25',
    green:   'text-green-400 bg-green-500/10 border-green-500/25',
    red:     'text-red-400 bg-red-500/10 border-red-500/25',
    zinc:    'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',
  }
  return (
    <span className={`font-mono text-[9px] uppercase tracking-widest border rounded-sm px-1.5 py-[3px] ${v[variant]}`}>
      {children}
    </span>
  )
}

// ── Card container ────────────────────────────────────────────────────────────
function Card({ label, badge, badgeVariant, children, headerRight, style = {}, className = '' }) {
  return (
    <div className={`border border-zinc-800/80 rounded-sm overflow-hidden ${className}`} style={style}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/80">
        <Mono className="text-zinc-300">{label}</Mono>
        <div className="flex items-center gap-2.5">
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
          {headerRight}
        </div>
      </div>
      <div className="bg-[#0a0a0c]">{children}</div>
    </div>
  )
}

// ── Source pills ──────────────────────────────────────────────────────────────
function SourcePills({ source }) {
  if (!source || source === 'simulated') return <Badge variant="zinc">Simulated</Badge>
  const parts = source.split(',').map(s => s.trim()).filter(Boolean)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {parts.map(p => <Badge key={p} variant="orange">{p}</Badge>)}
    </div>
  )
}

// ── Pipeline Stepper ──────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { label: 'Signal Harvest',   sub: 'Scanning NewsAPI · Google News RSS · Hacker News for live company signals' },
  { label: 'Research Analyst', sub: 'Synthesising account brief via Groq / Llama 3.3-70b' },
  { label: 'Email Sender',     sub: 'Writing & dispatching a personalised outreach email' },
]

function PipelineStepper({ stage }) {
  const pct = Math.round((stage / 3) * 100)
  return (
    <Card label="Pipeline" badge="Executing" badgeVariant="orange">
      <div className="p-5 space-y-4">
        <div className="divide-y divide-zinc-800/50">
          {PIPELINE_STEPS.map((step, i) => {
            const done   = i < stage
            const active = i === stage
            return (
              <div key={i} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className={`relative mt-0.5 w-6 h-6 rounded-sm border flex items-center justify-center shrink-0 transition-all duration-300 ${
                  done   ? 'border-green-800/80 bg-green-950/50 text-green-500' :
                  active ? 'border-orange-600/70 bg-orange-950/40 text-orange-400' :
                           'border-zinc-800 bg-transparent text-zinc-700'
                }`}>
                  {done   ? <IconCheck /> :
                   active ? <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> :
                            <Mono className="!text-[9px] text-zinc-700">{i + 1}</Mono>}
                  {active && (
                    <span className="absolute inset-0 overflow-hidden rounded-sm">
                      <span className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-orange-400/25 to-transparent animate-sweep" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-none tracking-tight ${
                    done ? 'text-zinc-500' : active ? 'text-white' : 'text-zinc-700'
                  }`}>{step.label}</p>
                  {active && <p className="text-xs text-zinc-500 mt-1.5 leading-snug">{step.sub}</p>}
                </div>
                <Mono className={`text-[9px] mt-0.5 shrink-0 ${
                  done ? 'text-green-600' : active ? 'text-orange-400' : 'text-zinc-700'
                }`}>
                  {done ? 'done' : active ? 'running' : 'queued'}
                </Mono>
              </div>
            )
          })}
        </div>
        <div>
          <div className="h-px bg-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }} />
            <div className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-orange-300/30 to-transparent animate-shimmer" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Mono className="text-zinc-700 !text-[9px]">step {stage + 1} of 3</Mono>
            <Mono className="text-zinc-700 !text-[9px]">{pct}%</Mono>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Signals Panel ─────────────────────────────────────────────────────────────
function SignalsPanel({ signals, source }) {
  const count = useCounter(signals.length)
  return (
    <Card label="01 — Signals" badge={`${count} captured`} badgeVariant="orange"
      headerRight={<SourcePills source={source} />}
      style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div className="divide-y divide-zinc-800/40">
        {signals.map((s, i) => (
          <div key={i} className="flex gap-3 px-5 py-3.5 first:pt-4 last:pb-4"
            style={{ animation: `slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${i * 75}ms` }}>
            <span className="font-mono text-orange-500/70 text-xs mt-px shrink-0 select-none">→</span>
            <span className="text-sm text-zinc-300 leading-relaxed">{s}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Brief Panel ───────────────────────────────────────────────────────────────
function BriefPanel({ brief }) {
  const text = useTypewriter(brief, 12, 400)
  const done = text.length >= brief.length
  return (
    <Card label="02 — Account Brief"
      style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
      <div className="px-5 py-5">
        <p className="text-sm text-zinc-300 leading-[1.85] whitespace-pre-line">
          {text}
          {!done && <span className="inline-block w-px h-[14px] bg-orange-400 ml-0.5 align-text-bottom animate-blink" />}
        </p>
      </div>
    </Card>
  )
}

// ── Email Panel ───────────────────────────────────────────────────────────────
function EmailPanel({ subject, body }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Card label="03 — Outreach Email"
      style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
      headerRight={
        <button onClick={copy}
          className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-zinc-600 hover:text-orange-400 transition-colors duration-150">
          <IconCopy />{copied ? 'Copied!' : 'Copy'}
        </button>
      }>
      <div className="divide-y divide-zinc-800/60">
        <div className="px-5 py-4">
          <Mono className="text-zinc-600 block mb-2">Subject Line</Mono>
          <p className="text-sm font-semibold text-orange-300 leading-snug">{subject}</p>
        </div>
        <div className="px-5 py-4">
          <Mono className="text-zinc-600 block mb-3">Body</Mono>
          <p className="text-sm text-zinc-300 leading-[1.85] whitespace-pre-line">{body}</p>
        </div>
      </div>
    </Card>
  )
}

// ── Delivery Status ───────────────────────────────────────────────────────────
function DeliveryStatus({ status, sendMethod, company }) {
  const sent = status === 'email_sent'
  return (
    <div className="flex items-center gap-4 border rounded-sm px-5 py-4"
      style={{
        animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.3s both',
        borderColor: sent ? 'rgba(22,101,52,0.4)' : 'rgba(127,29,29,0.4)',
        backgroundColor: sent ? 'rgba(5,46,22,0.15)' : 'rgba(69,10,10,0.15)',
      }}>
      <Dot color={sent ? 'green' : 'red'} size="md" pulse={sent} />
      <div className="flex-1">
        <p className={`text-sm font-semibold ${sent ? 'text-green-300' : 'text-red-300'}`}>
          {sent ? 'Email Delivered' : 'SMTP not configured — email previewed only'}
        </p>
        {sent && (
          <p className="text-xs text-zinc-500 mt-0.5">
            Sent to <span className="text-zinc-300">{company}</span>
            {sendMethod && <> · via <span className="text-zinc-300 capitalize">{sendMethod.replace('_', ' ')}</span></>}
          </p>
        )}
      </div>
      <Badge variant={sent ? 'green' : 'red'}>{sent ? 'Sent' : 'Preview'}</Badge>
    </div>
  )
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function StatRow({ signals, elapsed, company }) {
  const sigCount = useCounter(signals?.length ?? 0)
  const secCount = useCounter(elapsed ?? 0)
  return (
    <div className="grid grid-cols-3 divide-x divide-zinc-800/60 border border-zinc-800/60 rounded-sm overflow-hidden"
      style={{ animation: 'fadeIn 0.5s ease both' }}>
      {[
        { label: 'Signals Captured', value: sigCount },
        { label: 'Seconds Elapsed',  value: `${secCount}s` },
        { label: 'Company',          value: company },
      ].map(({ label, value }) => (
        <div key={label} className="px-5 py-4 bg-[#0a0a0c]">
          <Mono className="text-zinc-600 block mb-1.5">{label}</Mono>
          <p className="font-mono text-sm text-white font-semibold tabular-nums leading-none">{value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [icp,          setIcp]          = useState('')
  const [company,      setCompany]      = useState('')
  const [email,        setEmail]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const [elapsed,      setElapsed]      = useState(0)
  const elapsedRef     = useRef(0)

  useEffect(() => {
    if (!loading) { elapsedRef.current = 0; setElapsed(0); return }
    const iv = setInterval(() => { elapsedRef.current++; setElapsed(elapsedRef.current) }, 1000)
    return () => clearInterval(iv)
  }, [loading])

  const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-sm px-3.5 py-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/15 transition-all duration-200 font-sans'

  const handleRun = async () => {
    if (!icp.trim() || !company.trim() || !email.trim()) {
      setError('All three fields are required to run the pipeline.')
      return
    }
    setLoading(true); setLoadingStage(0); setResult(null); setError(null)
    const stageTimer = setInterval(() => setLoadingStage(p => Math.min(p + 1, 2)), 5500)
    try {
      const resp = await fetch(`${API_URL}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), icp: icp.trim(), email: email.trim() }),
      })
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.detail || `Server error ${resp.status}`) }
      const { job_id } = await resp.json()
      const poll = async () => {
        const pr = await fetch(`${API_URL}/job/${job_id}`)
        if (!pr.ok) throw new Error(`Poll error ${pr.status}`)
        const d = await pr.json()
        if (d.status === 'done') return d.result
        if (d.status === 'error') throw new Error(d.error || 'Pipeline failed')
        await new Promise(r => setTimeout(r, 2000))
        return poll()
      }
      const res = await poll()
      setLoadingStage(3)
      setResult({ ...res, totalElapsed: elapsedRef.current })
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      clearInterval(stageTimer); setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-orange-500/20 selection:text-orange-200">
      <div className="fixed inset-0 grid-bg pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 grid-vignette pointer-events-none" aria-hidden="true" />

      {/* System status bar */}
      <div className="relative z-10 border-b border-zinc-900 bg-zinc-950/90">
        <div className="max-w-4xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2"><Dot color="green" pulse /><Mono className="text-zinc-600">Systems nominal</Mono></div>
            <span className="text-zinc-800 select-none hidden sm:block">|</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <IconSignal />
              <Mono className="text-zinc-700">NewsAPI · Google News · Hacker News</Mono>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <IconTerminal />
            <Mono className="text-zinc-700">groq / llama-3.3-70b</Mono>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 border border-orange-600/40 bg-orange-500/10 rounded-sm flex items-center justify-center text-orange-400">
              <IconZap />
            </div>
            <div className="leading-none">
              <p className="font-mono font-bold text-[15px] text-white tracking-tight">FIREREACH</p>
              <p className="font-mono text-[9px] text-zinc-600 uppercase tracking-[0.22em] mt-0.5">Autonomous GTM Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="zinc">v1.0</Badge>
            <div className="border border-zinc-800 rounded-sm px-3 py-1.5 flex items-center gap-2">
              <Dot color="green" pulse />
              <Mono className="text-zinc-400">Live</Mono>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Hero */}
        <div className="pb-2" style={{ animation: 'fadeIn 0.5s ease both' }}>
          <h1 className="text-[22px] font-bold text-white tracking-tight leading-snug">
            Automated B2B Outreach Pipeline
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed max-w-2xl">
            Harvest live signals from multiple sources · synthesise a strategic account brief ·
            generate and send a personalised cold email — all autonomously.
          </p>
        </div>

        {/* Form */}
        <div className="border border-zinc-800/80 rounded-sm overflow-hidden"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-950/80">
            <Mono className="text-zinc-200">Mission Parameters</Mono>
            <Mono className="text-zinc-600">3-step automated pipeline</Mono>
          </div>
          <div className="p-6 bg-[#0a0a0c] space-y-6">
            <div>
              <FieldLabel n={1}>ICP — Ideal Customer Profile</FieldLabel>
              <textarea rows={3}
                placeholder="e.g. We sell high-end cybersecurity training to Series B startups scaling their engineering teams."
                value={icp} onChange={e => setIcp(e.target.value)}
                className={`${inputCls} resize-none`} />
            </div>
            <div className="h-px bg-zinc-800/50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel n={2}>Target Company</FieldLabel>
                <input type="text" placeholder="e.g. Stripe" value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
              </div>
              <div>
                <FieldLabel n={3}>Recipient Email</FieldLabel>
                <input type="email" placeholder="e.g. founder@stripe.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
            {error && !loading && (
              <div className="flex items-start gap-3 border border-red-900/40 bg-red-950/10 rounded-sm px-4 py-3"
                style={{ animation: 'fadeIn 0.2s ease both' }}>
                <Mono className="text-red-500 shrink-0 mt-px">Error</Mono>
                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
            )}
            <div className="h-px bg-zinc-800/50" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Mono className="text-zinc-700 truncate">Signal → Brief → Send</Mono>
                {loading && <span className="font-mono text-[11px] text-orange-500 tabular-nums shrink-0">{elapsed}s</span>}
              </div>
              <button onClick={handleRun} disabled={loading}
                className="inline-flex items-center gap-2.5 shrink-0 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:bg-zinc-800/80 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-mono text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-sm transition-all duration-150">
                {loading ? (
                  <><span className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />Executing...</>
                ) : (
                  <>Execute Pipeline<IconArrow /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline stepper */}
        {loading && <PipelineStepper stage={loadingStage} />}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1" style={{ animation: 'fadeIn 0.3s ease both' }}>
              <div className="flex items-center gap-3">
                <Dot color="green" />
                <Mono className="text-zinc-300">Pipeline Complete</Mono>
                <span className="text-zinc-800 font-mono text-xs select-none">·</span>
                <Mono className="text-zinc-600">{result.company}</Mono>
              </div>
              <button onClick={() => { setResult(null); setError(null) }}
                className="font-mono text-[9px] uppercase tracking-widest text-zinc-700 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-700 rounded-sm px-2.5 py-1">
                Clear
              </button>
            </div>
            <StatRow signals={result.signals} elapsed={result.totalElapsed} company={result.company} />
            {result.signals?.length > 0 && <SignalsPanel signals={result.signals} source={result.signal_source} />}
            {result.account_brief && <BriefPanel brief={result.account_brief} />}
            {(result.email_subject || result.email_body) && <EmailPanel subject={result.email_subject} body={result.email_body} />}
            <DeliveryStatus status={result.status} sendMethod={result.send_method} company={result.company} />
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-zinc-900 py-7 mt-16">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <Mono className="text-zinc-800">FireReach © 2026</Mono>
          <Mono className="text-zinc-800">Groq · Llama 3.3 · Autonomous GTM</Mono>
        </div>
      </footer>
    </div>
  )
}
