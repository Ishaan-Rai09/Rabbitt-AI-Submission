import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Arrow SVG icon
const ArrowRight = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6H10M10 6L6 2M10 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Monospace label
function Mono({ children, className = '' }) {
  return (
    <span className={`font-mono text-xs uppercase tracking-widest ${className}`}>
      {children}
    </span>
  )
}

function StepNum({ n }) {
  return (
    <Mono className="text-orange-400 select-none tabular-nums w-5 shrink-0">
      {String(n).padStart(2, '0')}
    </Mono>
  )
}

function Divider() {
  return <div className="border-t border-zinc-800/80" />
}

// Panel card wrapper
function Panel({ label, badge, badgeColor = 'zinc', children, action }) {
  const badgeColors = {
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    green:  'text-green-500  bg-green-500/10  border-green-500/20',
    red:    'text-red-400    bg-red-500/10    border-red-500/20',
    zinc:   'text-zinc-500   bg-zinc-800      border-zinc-700',
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <Mono className="text-zinc-200">{label}</Mono>
        <div className="flex items-center gap-3">
          {badge && (
            <span className={`inline-flex border rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Pipeline step progress
const STEPS = [
  { label: 'Signal Harvest',   sub: 'Scanning live company signals' },
  { label: 'Research Analyst', sub: 'Generating strategic account brief' },
  { label: 'Email Sender',     sub: 'Writing & delivering outreach email' },
]

function PipelineStepper({ stage }) {
  return (
    <Panel label="Pipeline Executing" badge="Live" badgeColor="orange">
      <div className="space-y-0 divide-y divide-zinc-800/60">
        {STEPS.map((step, i) => {
          const done   = i < stage
          const active = i === stage
          return (
            <div key={i} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                done   ? 'border-green-700  bg-green-900/40  text-green-500' :
                active ? 'border-orange-600 bg-orange-900/30 text-orange-500' :
                         'border-zinc-700   bg-transparent   text-zinc-700'
              }`}>
                {done   ? <CheckIcon /> :
                 active ? <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> :
                          <Mono className="text-zinc-700 !text-[9px]">{i + 1}</Mono>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-medium leading-none ${
                  done ? 'text-zinc-300' : active ? 'text-white' : 'text-zinc-500'
                }`}>{step.label}</p>
                {active && <p className="text-sm text-zinc-300 mt-1">{step.sub}</p>}
              </div>
              <Mono className={
                done   ? 'text-green-600' :
                active ? 'text-orange-500' :
                         'text-zinc-700'
              }>
                {done ? 'Done' : active ? 'Running' : 'Queued'}
              </Mono>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// Result panels
function SignalsPanel({ signals }) {
  return (
    <Panel label="01 - Signals Captured" badge={`${signals.length} found`} badgeColor="orange">
      <ul className="space-y-3">
        {signals.map((s, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-orange-400 font-mono text-sm mt-px shrink-0 select-none">-&gt;</span>
            <span className="text-base text-white leading-relaxed">{s}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function BriefPanel({ brief }) {
  return (
    <Panel label="02 - Account Brief">
      <p className="text-base text-white leading-7 whitespace-pre-line">{brief}</p>
    </Panel>
  )
}

function EmailPanel({ subject, body }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Panel
      label="03 - Generated Email"
      action={
        <button
          onClick={copy}
          className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 hover:text-orange-400 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <Mono className="text-zinc-300 block mb-1.5">Subject</Mono>
          <p className="text-base font-semibold text-orange-300 leading-snug">{subject}</p>
        </div>
        <Divider />
        <div>
          <Mono className="text-zinc-300 block mb-2">Body</Mono>
          <p className="text-base text-white leading-7 whitespace-pre-line">{body}</p>
        </div>
      </div>
    </Panel>
  )
}

function StatusBar({ status, sendMethod, company }) {
  const sent = status === 'email_sent'
  return (
    <div className={`flex items-center justify-between border rounded-md px-5 py-4 ${
      sent ? 'border-green-900/60 bg-green-950/25' : 'border-red-900/60 bg-red-950/25'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${sent ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <p className={`text-base font-semibold ${sent ? 'text-green-300' : 'text-red-300'}`}>
            {sent ? 'Email Delivered' : 'Delivery Failed'}
          </p>
          {sent && (
            <p className="text-sm text-zinc-300 mt-0.5">
              Sent to <span className="text-white font-medium">{company}</span>
              {sendMethod && <> via <span className="text-white font-medium capitalize">{sendMethod.replace('_', ' ')}</span></>}
            </p>
          )}
        </div>
      </div>
      <span className={`font-mono text-[9px] uppercase tracking-widest border rounded-sm px-1.5 py-0.5 ${
        sent
          ? 'text-green-500 bg-green-500/10 border-green-800'
          : 'text-red-400  bg-red-500/10  border-red-800'
      }`}>
        {sent ? 'Sent' : 'Failed'}
      </span>
    </div>
  )
}

// Main App
export default function App() {
  const [icp,          setIcp]          = useState('')
  const [company,      setCompany]      = useState('')
  const [email,        setEmail]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)

  const inputCls = 'w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 transition-colors'

  const handleRun = async () => {
    if (!icp.trim() || !company.trim() || !email.trim()) {
      setError('Please fill in all three fields.')
      return
    }

    setLoading(true)
    setLoadingStage(0)
    setResult(null)
    setError(null)

    const stageTimer = setInterval(() => {
      setLoadingStage((prev) => Math.min(prev + 1, 2))
    }, 4000)

    try {
      const enqueueResp = await fetch(`${API_URL}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), icp: icp.trim(), email: email.trim() }),
      })

      if (!enqueueResp.ok) {
        const detail = await enqueueResp.json().catch(() => ({}))
        throw new Error(detail.detail || `Server error ${enqueueResp.status}`)
      }

      const { job_id } = await enqueueResp.json()

      const poll = async () => {
        const pollResp = await fetch(`${API_URL}/job/${job_id}`)
        if (!pollResp.ok) throw new Error(`Poll error ${pollResp.status}`)
        const data = await pollResp.json()
        if (data.status === 'done') return data.result
        if (data.status === 'error') throw new Error(data.error || 'Agent pipeline failed')
        await new Promise((res) => setTimeout(res, 2000))
        return poll()
      }

      const res = await poll()
      setResult(res)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      clearInterval(stageTimer)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">

      {/* Orange top accent line */}
      <div className="h-0.5 bg-orange-500 w-full" />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-sm flex items-center justify-center text-xs select-none">
              🔥
            </div>
            <div className="leading-none">
              <p className="font-mono font-bold text-base text-white tracking-tight">FIREREACH</p>
              <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">Autonomous GTM Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-zinc-800 rounded px-2.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <Mono className="text-zinc-200">Groq / Llama 3.3</Mono>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-5">

        {/* Form */}
        <div className="border border-zinc-800 rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <Mono className="text-white">New Outreach Run</Mono>
            <Mono className="text-zinc-400">3 steps / automated</Mono>
          </div>

          <div className="p-5 space-y-5">
            {/* ICP */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StepNum n={1} />
                <Mono className="text-zinc-200">ICP - Ideal Customer Profile</Mono>
              </div>
              <textarea
                rows={3}
                placeholder="e.g. We sell high-end cybersecurity training to Series B startups scaling their engineering teams."
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>

            <Divider />

            {/* Company + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StepNum n={2} />
                  <Mono className="text-zinc-200">Target Company</Mono>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Stripe"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StepNum n={3} />
                  <Mono className="text-zinc-200">Recipient Email</Mono>
                </div>
                <input
                  type="email"
                  placeholder="e.g. founder@stripe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Error */}
            {error && !loading && (
              <div className="flex items-start gap-2.5 border border-red-900/50 bg-red-950/20 rounded px-3.5 py-3">
                <Mono className="text-red-400 shrink-0 mt-px">Err</Mono>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <Divider />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Mono className="text-zinc-300">Signal / Brief / Send</Mono>
              <button
                onClick={handleRun}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-mono text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-colors"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    Execute Pipeline
                    <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stepper */}
        {loading && <PipelineStepper stage={loadingStage} />}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <Mono className="text-zinc-300">Pipeline Complete - {result.company}</Mono>
              </div>
              <button
                onClick={() => { setResult(null); setError(null) }}
                className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                Clear
              </button>
            </div>

            {result.signals?.length > 0 && <SignalsPanel signals={result.signals} />}
            {result.account_brief      && <BriefPanel   brief={result.account_brief} />}
            {(result.email_subject || result.email_body) && (
              <EmailPanel subject={result.email_subject} body={result.email_body} />
            )}
            <StatusBar
              status={result.status}
              sendMethod={result.send_method}
              company={result.company}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-10">
        <p className="text-center font-mono text-[9px] uppercase tracking-widest text-zinc-700">
          FireReach / Autonomous GTM Outreach / Groq / Llama 3.3 / 2026
        </p>
      </footer>
    </div>
  )
}