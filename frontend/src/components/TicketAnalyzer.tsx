import { useState } from 'react'
import { Search, Hash, AlertCircle } from 'lucide-react'
import { analyzeTicket } from '../services/api'
import type { AnalysisResult, LoadingStep } from '../types'
import LoadingSteps from './LoadingSteps'
import BugAnalysisView from './BugAnalysisView'
import StoryAnalysisView from './StoryAnalysisView'

const LOADING_STEPS = [
  'Fetching ticket from OpenProject...',
  'Loading comments & activity...',
  'Loading attachments...',
  'Classifying ticket type with AI...',
  'Running deep analysis...',
  'Generating insights & recommendations...',
]

export default function TicketAnalyzer() {
  const [ticketId, setTicketId] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<LoadingStep[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const runStepAnimation = async () => {
    const initialSteps = LOADING_STEPS.map((label, i) => ({
      label,
      done: false,
      active: i === 0,
    }))
    setSteps(initialSteps)

    for (let i = 0; i < LOADING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 400))
      setSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          done: idx < i + 1,
          active: idx === i + 1,
        }))
      )
    }
  }

  const handleAnalyze = async () => {
    const id = parseInt(ticketId.trim(), 10)
    if (!id || isNaN(id)) {
      setError('Please enter a valid numeric ticket ID')
      return
    }

    setError('')
    setResult(null)
    setLoading(true)

    // Run step animation in parallel with the actual API call
    runStepAnimation()

    try {
      const data = await analyzeTicket(id)
      setResult(data)
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to analyze ticket. Check your API configuration.'
      setError(message)
    } finally {
      setLoading(false)
      setSteps([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Card */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Search size={18} className="text-blue-600" />
          Analyze an OpenProject Ticket
        </h2>

        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              placeholder="Enter ticket ID (e.g. 663865)"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search size={16} />
                Analyze Ticket
              </>
            )}
          </button>
        </div>

        {ticketId && (
          <p className="mt-2 text-xs text-gray-500">
            Will fetch:{' '}
            <span className="font-mono text-blue-600">
              https://project.intermesh.net/work_packages/{ticketId}
            </span>
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">Analysis Failed</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Loading steps */}
      {loading && steps.length > 0 && <LoadingSteps steps={steps} />}

      {/* Result */}
      {result && !loading && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
              AI Analysis Report — Ticket #{result.ticket_summary.id}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {result.analysis_mode === 'bug' ? (
            <BugAnalysisView
              analysis={result.analysis as any}
              summary={result.ticket_summary}
            />
          ) : (
            <StoryAnalysisView
              analysis={result.analysis as any}
              summary={result.ticket_summary}
            />
          )}
        </div>
      )}
    </div>
  )
}
