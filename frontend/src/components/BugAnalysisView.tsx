import {
  Bug, FlaskConical, AlertTriangle, Wrench, CheckSquare,
  ChevronDown, ChevronUp, ExternalLink, ShieldAlert
} from 'lucide-react'
import { useState } from 'react'
import type { BugAnalysis, TicketSummary } from '../types'

interface Props {
  analysis: BugAnalysis
  summary: TicketSummary
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: 'badge-critical',
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  }
  return <span className={map[severity] || 'badge-medium'}>{severity}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  }
  return <span className={map[priority] || 'badge-medium'}>{priority}</span>
}

function Section({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          {icon}
          <span>{title}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function BugAnalysisView({ analysis, summary }: Props) {
  return (
    <div>
      {/* Ticket meta */}
      <div className="card mb-4 border-l-4 border-l-red-500">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bug size={18} className="text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Bug Ticket</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">#{summary.id}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{summary.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {summary.project} · {summary.status} · {summary.activity_count} comments · {summary.attachment_count} files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={analysis.severity} />
            <a
              href={summary.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              Open <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700 bg-red-50 rounded-lg p-3 border border-red-100">
          {analysis.bug_summary}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">User Impact</p>
            <p className="text-sm text-gray-800 mt-1">{analysis.user_impact}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Business Impact</p>
            <p className="text-sm text-gray-800 mt-1">{analysis.business_impact}</p>
          </div>
        </div>
      </div>

      {/* RCA */}
      <Section icon={<ShieldAlert size={18} className="text-purple-600" />} title="Root Cause Analysis (RCA)">
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Probable Root Cause</p>
            <p className="text-sm font-medium text-gray-900">{analysis.rca.probable_cause}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Technical Explanation</p>
            <p className="text-sm text-gray-700">{analysis.rca.technical_explanation}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Impacted Modules</p>
              <ul className="space-y-1">
                {analysis.rca.impacted_modules.map((mod, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    {mod}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Flow Impact</p>
              <p className="text-sm text-gray-700">{analysis.rca.data_flow_impact}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Test Cases */}
      <Section icon={<FlaskConical size={18} className="text-blue-600" />} title={`Test Cases (${analysis.test_cases?.length || 0})`}>
        <div className="space-y-3">
          {(analysis.test_cases || []).map((tc, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-blue-50 px-4 py-2.5">
                <span className="text-xs font-bold text-blue-800">{tc.id}</span>
                <span className="text-xs font-medium text-blue-700 truncate mx-2">{tc.scenario}</span>
                <PriorityBadge priority={tc.priority} />
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {tc.preconditions && (
                  <p className="text-xs text-gray-500"><span className="font-medium">Pre:</span> {tc.preconditions}</p>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Steps</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {tc.steps.map((s, si) => (
                      <li key={si} className="text-xs text-gray-700">{s}</li>
                    ))}
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs font-semibold text-green-700">Expected</p>
                    <p className="text-xs text-gray-700 mt-0.5">{tc.expected_result}</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-xs font-semibold text-red-700">Actual (Bug)</p>
                    <p className="text-xs text-gray-700 mt-0.5">{tc.actual_result}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Edge Cases */}
      <Section icon={<AlertTriangle size={18} className="text-yellow-500" />} title="Edge Cases" defaultOpen={false}>
        <div className="space-y-3">
          {(analysis.edge_cases || []).map((ec, i) => (
            <div key={i} className="border border-yellow-100 rounded-lg bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-gray-800">{ec.scenario}</p>
              <p className="text-xs text-yellow-700 mt-1"><span className="font-medium">Why it matters:</span> {ec.why_it_matters}</p>
              <p className="text-xs text-gray-600 mt-1"><span className="font-medium">How to test:</span> {ec.how_to_test}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Suggested Fix */}
      <Section icon={<Wrench size={18} className="text-green-600" />} title="Suggested Fix">
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Approach</p>
            <p className="text-sm text-gray-800">{analysis.suggested_fix.approach}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Code Areas to Look At</p>
              <ul className="space-y-1">
                {analysis.suggested_fix.code_areas.map((area, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-center gap-2">
                    <span className="font-mono text-blue-600 text-xs bg-blue-50 px-1.5 py-0.5 rounded">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated Effort</p>
              <p className="text-lg font-bold text-blue-700">{analysis.suggested_fix.estimated_effort}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Implementation Steps</p>
            <ol className="list-decimal list-inside space-y-1.5">
              {analysis.suggested_fix.implementation_steps.map((step, i) => (
                <li key={i} className="text-sm text-gray-700">{step}</li>
              ))}
            </ol>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Verification After Fix</p>
            <p className="text-sm text-gray-700">{analysis.suggested_fix.testing_after_fix}</p>
          </div>
        </div>
      </Section>

      {/* Regression Checklist */}
      <Section icon={<CheckSquare size={18} className="text-teal-600" />} title="Regression Checklist" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(analysis.regression_checklist || []).map((item, i) => (
            <label key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded text-blue-600" />
              <span className="text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  )
}
