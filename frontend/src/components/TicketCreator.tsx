import { useState, useRef } from 'react'
import {
  PlusCircle, Paperclip, X, CheckCircle, AlertCircle,
  ExternalLink, Sparkles, Loader, Mail, MessageCircle,
} from 'lucide-react'
import type { CreateTicketResult } from '../types'
import axios from 'axios'

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

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setError('Please describe the ticket')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      files.forEach((f) => formData.append('files', f))

      const { data } = await axios.post<CreateTicketResult>('/api/create-ticket', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create ticket.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <PlusCircle size={18} className="text-green-600" />
          Create a Ticket with AI
        </h2>

        {/* Prompt textarea */}
        <div className="relative mb-4">
          <Sparkles size={16} className="absolute left-3 top-3.5 text-gray-400" />
          <textarea
            rows={6}
            placeholder="Describe the issue or feature..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* File upload */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors"
          >
            <Paperclip size={16} />
            Attach files (screenshots, logs) · max 5
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full px-3 py-1">
                  <Paperclip size={12} />
                  <span className="max-w-[150px] truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="ml-1 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading || !prompt.trim()}
          className="w-full sm:w-auto px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={16} className="animate-spin" />Creating ticket...</>
          ) : (
            <><PlusCircle size={16} />Create Ticket</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div><p className="font-semibold">Creation Failed</p><p className="mt-0.5">{error}</p></div>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="card border-l-4 border-l-green-500">
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
              {result.uploaded_files.map((f, i) => (
                <p key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                  <Paperclip size={12} className="text-blue-500" />{f}
                </p>
              ))}
            </div>
          )}

          {/* Notification status */}
          {result.notifications && !result.notifications.skipped && !result.notifications.error && result.notifications.results && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                <MessageCircle size={13} /> Notifications sent
              </p>
              {result.notifications.results.map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-700 mb-1">
                  <span className="capitalize font-medium text-gray-800 w-20">{n.role}:</span>
                  <span className="text-gray-500">{n.name}</span>
                  <span className="ml-auto flex gap-2">
                    {n.sent_chat && <span className="flex items-center gap-1 text-blue-600"><MessageCircle size={11} />Chat</span>}
                    {n.sent_email && <span className="flex items-center gap-1 text-green-600"><Mail size={11} />Gmail</span>}
                    {!n.sent_chat && !n.sent_email && <span className="text-red-400">Not sent</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {result.notifications?.skipped && (
            <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded p-2 border border-gray-100">
              Notifications skipped: {result.notifications.reason}
            </p>
          )}
          {result.notifications?.error && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded p-2 border border-amber-100">
              Notification error: {result.notifications.error}
            </p>
          )}

          {result.extraction_notes && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded p-2 border border-amber-100">
              AI Notes: {result.extraction_notes}
            </p>
          )}

          <p className="mt-3 text-xs font-mono text-gray-400 break-all">{result.ticket_url}</p>
        </div>
      )}
    </div>
  )
}
