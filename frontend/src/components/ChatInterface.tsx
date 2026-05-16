import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, CheckCircle2, Circle,
  ExternalLink, Video, Mail, Calendar, AlertCircle,
  Sparkles, Bot, RotateCcw, ArrowRight,
} from 'lucide-react'
import { analyzeTicket, createTicket } from '../services/api'
import type { AnalysisResult, CreateTicketResult } from '../types'
import BugAnalysisView from './BugAnalysisView'
import StoryAnalysisView from './StoryAnalysisView'

// ─── Steps ─────────────────────────────────────────────────────────────────────

const ANALYZE_STEPS = [
  'Fetching ticket from OpenProject',
  'Reading comments & activity',
  'Checking attachments',
  'Classifying ticket type with AI',
  'Running deep analysis',
  'Generating insights & recommendations',
]
const CREATE_STEPS = [
  'Understanding your request',
  'Finding project in OpenProject',
  'Resolving assignee & accountable',
  'Creating ticket in OpenProject',
  'Scheduling Google Meet (2 PM – 3 PM IST)',
  'Sending email notifications',
]

const EXAMPLES = [
  { tag: 'RCA',   label: 'Analyse a ticket', prompt: 'Analyse ticket #664712' },
  { tag: 'Bug',   label: 'Create a bug',     prompt: 'Create a bug in Android bucket — tender page blank on load. Assign to Vishal Bairagi, accountable Braj Mohan, priority High.' },
  { tag: 'RCA',   label: 'Analyse another',  prompt: 'Analyse ticket #663865' },
  { tag: 'Story', label: 'Create a story',   prompt: 'Create a story in iOS bucket — redesign profile screen for better UX. Assign to Priyanshu Gaurav, accountable Soumya Sarkar, priority Medium.' },
]

const TAG_COLORS: Record<string, string> = {
  RCA:   'bg-violet-100 text-violet-700',
  Bug:   'bg-red-100 text-red-600',
  Story: 'bg-emerald-100 text-emerald-700',
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Intent    = 'analyze' | 'create'
type StepStatus = 'pending' | 'active' | 'done'
interface StepItem { label: string; status: StepStatus }
interface Message {
  id: string; role: 'user' | 'assistant'; content: string
  intent?: Intent; loading?: boolean
  analysisResult?: AnalysisResult; createResult?: CreateTicketResult; error?: string
}

function detectIntent(text: string): { intent: Intent; ticketId?: number } {
  const id       = text.match(/\b(\d{4,7})\b/)
  const isAnalyze = /anal[yz]|fetch ticket|check ticket|look up|ticket #/i.test(text)
  const isCreate  = /create|add|new ticket|raise|log bug|report bug/i.test(text)
  if (id && (isAnalyze || !isCreate)) return { intent: 'analyze', ticketId: parseInt(id[1]) }
  return { intent: 'create' }
}

// ─── Landing ───────────────────────────────────────────────────────────────────

function LandingScreen({ input, onChange, onSend, loading }: {
  input: string; onChange: (v: string) => void; onSend: () => void; loading: boolean
}) {
  const [focus, setFocus] = useState(false)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg,#fafafe 0%,#f3f4fd 50%,#fafafd 100%)' }}>

      {/* Brand heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4338ca)' }}>
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black leading-none tracking-tight">
            <span style={{ color: '#4f46e5' }}>IndiaMART</span>
            <span className="text-gray-900"> Project Planner</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">AI-powered · OpenProject · Google Meet</p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-gray-500 text-sm text-center mb-8 max-w-md">
        Analyse any ticket for RCA &amp; test cases — or create bugs &amp; stories with
        auto email notifications and Google Meet scheduling.
      </p>

      {/* Input card */}
      <div className="w-full max-w-2xl mb-5"
        style={{
          borderRadius: 20,
          border: `1.5px solid ${focus ? '#6366f1' : '#e5e7eb'}`,
          boxShadow: focus
            ? '0 0 0 4px rgba(99,102,241,0.12), 0 8px 32px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)'
            : '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          background: '#fff',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        <textarea
          rows={3}
          value={input}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          disabled={loading}
          autoFocus
          placeholder='e.g. "Analyse ticket #664712"  or  "Create a High priority bug in Android bucket — tender page blank. Assign to Vishal, accountable Braj Mohan."'
          style={{ resize: 'none', outline: 'none', width: '100%', padding: '20px 20px 12px', fontSize: 14, color: '#111827', background: 'transparent', lineHeight: 1.6, borderRadius: '20px 20px 0 0', display: 'block' }}
        />
        {/* Footer row inside card */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6',
          background: '#fafafa', borderRadius: '0 0 20px 20px',
        }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>@indiamart.com</span>
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 12, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              background: loading || !input.trim() ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1 0%,#4338ca 100%)',
              color: loading || !input.trim() ? '#9ca3af' : '#fff',
              fontSize: 13, fontWeight: 600, transition: 'opacity 0.15s',
            }}
          >
            {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> : <>Send <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="w-full max-w-2xl">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Or try one of these</p>
        <div className="grid grid-cols-2 gap-2.5">
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => onChange(ex.prompt)}
              className="flex items-start gap-3 text-left px-4 py-3.5 rounded-2xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${TAG_COLORS[ex.tag]}`}>{ex.tag}</span>
              <span>
                <p className="text-sm font-semibold text-gray-800">{ex.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ex.prompt}</p>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-2 mt-8 flex-wrap justify-center">
        {['OpenProject', 'Google Calendar', 'Gmail', 'Meet links', 'Groq LLM'].map((t, i, a) => (
          <span key={t} className="flex items-center gap-2 text-xs text-gray-400">
            {t}{i < a.length - 1 && <span className="text-gray-200">·</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Steps panel ───────────────────────────────────────────────────────────────

function StepsPanel({ steps, intent, loading }: { steps: StepItem[]; intent: Intent | null; loading: boolean }) {
  const done  = steps.filter(s => s.status === 'done').length
  const total = steps.length
  return (
    <div style={{ width: 280, flexShrink: 0, background: '#ffffff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
          {intent === 'analyze' ? 'Analysing Ticket' : 'Creating Ticket'}
        </p>
        <div style={{ height: 3, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#22d3ee)', width: total ? (done / total * 100) + '%' : '0%', transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>{done} of {total} steps</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 18, flexShrink: 0, marginTop: 1 }}>
              {s.status === 'done'    && <CheckCircle2 size={16} color="#10b981" />}
              {s.status === 'active'  && <Loader2      size={16} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />}
              {s.status === 'pending' && <Circle       size={16} color="#cbd5e1" />}
            </div>
            <span style={{
              fontSize: 13, lineHeight: 1.4,
              color: s.status === 'done' ? '#94a3b8' : s.status === 'active' ? '#1e293b' : '#cbd5e1',
              fontWeight: s.status === 'active' ? 600 : 400,
            }}>{s.label}</span>
          </div>
        ))}
      </div>
      {!loading && done === total && total > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={13} color="#10b981" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>
            {intent === 'analyze' ? 'Analysis complete' : 'Ticket is live'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Bubbles ───────────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 4px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} className="dot-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

function CreateCard({ r }: { r: CreateTicketResult }) {
  const meet = r.meeting?.meetLink, time = r.meeting?.meeting_time
  const skipped = r.meeting?.skipped, emailed = r.notifications?.results?.some(x => x.sent_email)
  return (
    <div style={{ marginTop: 4, border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', maxWidth: 420, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
      <div style={{ background: '#f0fdf4', borderBottom: '1px solid #d1fae5', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: '#065f46' }}>
          <CheckCircle2 size={15} color="#10b981" /> Ticket #{r.ticket_id} Created
        </span>
        <a href={r.ticket_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
          Open <ExternalLink size={11} />
        </a>
      </div>
      <div style={{ background: '#fff', padding: '12px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{r.subject}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: '#6b7280' }}>
          <span><b style={{ color: '#374151' }}>Project</b> · {r.project}</span>
          <span><b style={{ color: '#374151' }}>Type</b> · {r.type}</span>
          <span><b style={{ color: '#374151' }}>Priority</b> · {r.priority}</span>
          <span><b style={{ color: '#374151' }}>Assignee</b> · {r.assignee || '—'}</span>
          <span><b style={{ color: '#374151' }}>Accountable</b> · {r.accountable || '—'}</span>
        </div>
      </div>
      <div style={{ background: '#f9fafb', borderTop: '1px solid #f3f4f6', padding: '8px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {!skipped && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563' }}>
            <Calendar size={12} color="#6366f1" />
            {time ? time.replace(/^\d{4}-\d{2}-\d{2} /, '') : 'Tomorrow 2–3 PM IST'}
            {meet && <a href={meet} target="_blank" rel="noreferrer" style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 4, color: '#6366f1', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}><Video size={11} /> Join Meet</a>}
          </span>
        )}
        {emailed && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669', fontWeight: 500 }}><Mail size={12} /> Emails sent</span>}
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '70%', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', background: 'linear-gradient(135deg,#6366f1,#4338ca)', color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {msg.content}
      </div>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Bot size={15} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {msg.loading && <ThinkingDots />}
        {msg.error && (
          <div style={{ display: 'flex', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', maxWidth: 480 }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div><p style={{ fontWeight: 600, color: '#b91c1c', fontSize: 13 }}>Failed</p><p style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>{msg.error}</p></div>
          </div>
        )}
        {msg.createResult && <CreateCard r={msg.createResult} />}
        {msg.analysisResult && (
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Sparkles size={12} color="#6366f1" /> Analysis complete — Ticket #{msg.analysisResult.ticket_summary.id}
            </p>
            {msg.analysisResult.analysis_mode === 'bug'
              ? <BugAnalysisView analysis={msg.analysisResult.analysis as any} summary={msg.analysisResult.ticket_summary} />
              : <StoryAnalysisView analysis={msg.analysisResult.analysis as any} summary={msg.analysisResult.ticket_summary} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ChatInterface() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [steps, setSteps]         = useState<StepItem[]>([])
  const [loading, setLoading]     = useState(false)
  const [activeIntent, setIntent] = useState<Intent | null>(null)
  const endRef   = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idxRef   = useRef(0)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const startSteps = (intent: Intent) => {
    const defs = (intent === 'analyze' ? ANALYZE_STEPS : CREATE_STEPS).map((label, i) => ({
      label, status: (i === 0 ? 'active' : 'pending') as StepStatus,
    }))
    setSteps(defs); idxRef.current = 0
    const ms = intent === 'analyze' ? 1800 : 2500
    timerRef.current = setInterval(() => {
      idxRef.current++
      const idx = idxRef.current
      if (idx >= defs.length - 1) { clearInterval(timerRef.current!); return }
      setSteps(prev => prev.map((s, i) => ({ ...s, status: i < idx ? 'done' : i === idx ? 'active' : 'pending' })))
    }, ms)
  }

  const finishSteps = () => { if (timerRef.current) clearInterval(timerRef.current); setSteps(prev => prev.map(s => ({ ...s, status: 'done' }))) }

  const handleSend = async () => {
    const text = input.trim(); if (!text || loading) return
    const { intent, ticketId } = detectIntent(text)
    const base = Date.now().toString(), aiId = base + '-ai'
    setMessages(prev => [...prev, { id: base + '-user', role: 'user', content: text }, { id: aiId, role: 'assistant', content: '', intent, loading: true }])
    setInput(''); setLoading(true); setIntent(intent); startSteps(intent)
    try {
      if (intent === 'analyze') {
        if (!ticketId) throw new Error('No ticket ID found. Include the number, e.g. "analyse ticket 664712"')
        const result = await analyzeTicket(ticketId)
        finishSteps(); setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false, analysisResult: result } : m))
      } else {
        const result = await createTicket(text)
        finishSteps(); setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false, createResult: result } : m))
      }
    } catch (err: any) {
      finishSteps()
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong'
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false, error: errMsg } : m))
    } finally { setLoading(false) }
  }

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setMessages([]); setSteps([]); setInput(''); setLoading(false); setIntent(null)
  }

  const isLanding = messages.length === 0

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {isLanding ? (
          <LandingScreen input={input} onChange={setInput} onSend={handleSend} loading={loading} />
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', borderBottom: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Session active
              </div>
              <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                <RotateCcw size={13} /> New chat
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 24, background: '#f8fafc' }}>
              {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
              <div ref={endRef} />
            </div>

            {/* Bottom input — bigger and cleaner */}
            <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #f1f5f9', padding: '12px 16px 14px' }}>
              <div style={{
                maxWidth: 760, margin: '0 auto',
                border: '1.5px solid #e2e8f0', borderRadius: 16, background: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 14px 12px 16px',
              }}>
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  disabled={loading}
                  placeholder='Type your request — "analyse ticket 664712" or "create a bug in Android..."'
                  style={{ flex: 1, resize: 'none', outline: 'none', border: 'none', fontSize: 14, color: '#111827', background: 'transparent', lineHeight: 1.6, fontFamily: 'inherit', maxHeight: 140, overflowY: 'auto' }}
                />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0,
                    background: loading || !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#4338ca)',
                    color: loading || !input.trim() ? '#94a3b8' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                  }}>
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', fontFamily: 'monospace', fontSize: 10 }}>Enter</kbd> to send
                &nbsp;·&nbsp;
                <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', fontFamily: 'monospace', fontSize: 10 }}>Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        )}
      </div>

      {steps.length > 0 && <StepsPanel steps={steps} intent={activeIntent} loading={loading} />}
    </div>
  )
}
