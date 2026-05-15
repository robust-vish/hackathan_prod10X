import { useState, useRef } from 'react'
import { PlusCircle, Paperclip, X, CheckCircle, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
import { createTicket } from '../services/api'
import type { CreateTicketResult } from '../types'

const EXAMPLE_PROMPTS = [
  'Create a bug ticket in Android bucket for tender listing issue. Assign to Vishal. Add Anjali as accountable. Priority High.',
  'Create a UI story to improve BuyLead CTA visibility on mobile. Assign to Rahul. Priority Normal.',
  'Create a task ticket in IM-Native project for performance optimization of search results page. Assign to Priya. Priority High.',
]

export default function TicketCreator() {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CreateTicketResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected].slice(0, 5))
  }

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setError('Please describe the ticket you want to create')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await createTicket(prompt, files.length ? files : undefined)
      setResult(data)
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create ticket. Check your API configuration.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-1 flex items-center gap-2">
          <PlusCircle size={18} className="text-green-600" />
          Create a Ticket with AI
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Describe the ticket in plain English — AI will extract the details and create it in OpenProject automatically.
        </p>

        {/* Example prompts */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full px-3 py-1.5 transition-colors border border-gray-200 hover:border-blue-200 text-left"
              >
                {p.slice(0, 60)}...
              </button>
            ))}
          </div>
        </div>

        {/* Prompt textarea */}
        <div className="relative">
          <Sparkles size={16} className="absolute left-3 top-3 text-gray-400" />
          <textarea
            rows={5}
            placeholder="e.g. Create a bug ticket in Android bucket for tender listing issue. Assign to Vishal. Add Anjali as accountable. Priority High."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
          />
        </div>

        {/* File upload */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Paperclip size={16} />
            Attach files (screenshots, logs) · max 5
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full px-3 py-1"
                >
                  <Paperclip size={12} />
                  <span className="max-w-[150px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="ml-1 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="mt-4 w-full sm:w-auto px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating ticket...
            </>
          ) : (
            <>
              <PlusCircle size={16} />
              Create Ticket in OpenProject
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">Creation Failed</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="mt-4 card border-l-4 border-l-green-500">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={24} className="text-green-500" />
            <div>
              <p className="font-bold text-green-800">Ticket Created Successfully!</p>
              <p className="text-xs text-gray-500">ID: #{result.ticket_id}</p>
            </div>
            <a
              href={result.ticket_url}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Open Ticket <ExternalLink size={14} />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Title', value: result.subject },
              { label: 'Project', value: result.project },
              { label: 'Type', value: result.type },
              { label: 'Priority', value: result.priority },
              { label: 'Assignee', value: result.assignee || '—' },
              { label: 'Accountable', value: result.accountable || '—' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {result.uploaded_files.length > 0 && (
            <div className="mt-3 bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Uploaded Files</p>
              <ul className="space-y-1">
                {result.uploaded_files.map((f, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                    <Paperclip size={12} className="text-blue-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.extraction_notes && (
            <p className="mt-3 text-xs text-gray-400 italic">Note: {result.extraction_notes}</p>
          )}

          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-mono text-gray-600 break-all">{result.ticket_url}</p>
          </div>
        </div>
      )}
    </div>
  )
}
