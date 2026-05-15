import {
  FlaskConical, TrendingUp, Target, Shield, Lightbulb,
  ChevronDown, ChevronUp, Users, BarChart3, ExternalLink, CheckCircle, XCircle
} from 'lucide-react'
import { useState } from 'react'
import type { StoryAnalysis, TicketSummary } from '../types'

interface Props {
  analysis: StoryAnalysis
  summary: TicketSummary
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

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    High: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[level] || map.Medium}`}>
      {level} Risk
    </span>
  )
}

export default function StoryAnalysisView({ analysis, summary }: Props) {
  return (
    <div>
      {/* Ticket meta */}
      <div className="card mb-4 border-l-4 border-l-indigo-500">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={18} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Story / UI Ticket</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">#{summary.id}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{summary.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {summary.project} · {summary.status} · {summary.activity_count} comments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analysis.ab_testing_applicable ? (
              <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle size={13} /> A/B Test Applicable
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <XCircle size={13} /> A/B Not Recommended
              </span>
            )}
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
        <p className="mt-3 text-sm text-gray-700 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
          {analysis.story_summary}
        </p>
      </div>

      {/* A/B Hypothesis */}
      <Section icon={<FlaskConical size={18} className="text-indigo-600" />} title="A/B Test Design & Hypothesis">
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Hypothesis</p>
            <p className="text-sm text-gray-800 italic">"{analysis.hypothesis}"</p>
          </div>
          <p className="text-sm text-gray-600">{analysis.ab_testing_justification}</p>

          {/* Variants side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">A</span>
                <span className="text-sm font-semibold text-gray-700">Control</span>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">{analysis.variants?.control?.name}</p>
              <p className="text-sm text-gray-700">{analysis.variants?.control?.description}</p>
              {analysis.variants?.control?.screenshot_description && (
                <p className="text-xs text-gray-400 mt-2 italic">{analysis.variants.control.screenshot_description}</p>
              )}
            </div>
            <div className="border-2 border-indigo-300 rounded-xl p-4 bg-indigo-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">B</span>
                <span className="text-sm font-semibold text-indigo-800">Treatment</span>
              </div>
              <p className="text-xs font-medium text-indigo-600 mb-1">{analysis.variants?.treatment?.name}</p>
              <p className="text-sm text-gray-700">{analysis.variants?.treatment?.description}</p>
              {analysis.variants?.treatment?.screenshot_description && (
                <p className="text-xs text-indigo-400 mt-2 italic">{analysis.variants.treatment.screenshot_description}</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Metrics */}
      <Section icon={<BarChart3 size={18} className="text-blue-600" />} title="Metrics & KPIs">
        <div className="space-y-4">
          {/* Primary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-blue-600" />
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Primary Metric</p>
            </div>
            <p className="text-base font-bold text-gray-900">{analysis.metrics?.primary_metric?.name}</p>
            <p className="text-xs text-gray-600 mt-1">{analysis.metrics?.primary_metric?.measurement}</p>
            {analysis.metrics?.primary_metric?.baseline && (
              <p className="text-xs text-blue-700 mt-1 font-medium">Baseline: {analysis.metrics.primary_metric.baseline}</p>
            )}
          </div>

          {/* Secondary */}
          {analysis.metrics?.secondary_metrics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Secondary Metrics</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.metrics.secondary_metrics.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.measurement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guardrail */}
          {analysis.metrics?.guardrail_metrics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Guardrail Metrics (must NOT decrease)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.metrics.guardrail_metrics.map((m, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">{m.name}</p>
                    {m.threshold && <p className="text-xs text-red-600 mt-0.5">Min threshold: {m.threshold}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Success Criteria */}
      <Section icon={<TrendingUp size={18} className="text-green-600" />} title="Success Criteria">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Min. Detectable Effect', value: analysis.success_criteria?.minimum_detectable_effect },
            { label: 'Statistical Significance', value: analysis.success_criteria?.statistical_significance },
            { label: 'Sample Size / Variant', value: analysis.success_criteria?.minimum_sample_size },
            { label: 'Duration', value: analysis.success_criteria?.recommended_duration },
            { label: 'Traffic Split', value: analysis.success_criteria?.traffic_split },
          ].map((item, i) => (
            <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700 font-medium">{item.label}</p>
              <p className="text-base font-bold text-gray-900 mt-1">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Target Audience */}
      <Section icon={<Users size={18} className="text-teal-600" />} title="Target Audience" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-teal-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Segment</p>
            <p className="text-sm text-gray-800">{analysis.target_audience?.segment}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Exclusions</p>
            <p className="text-sm text-gray-800">{analysis.target_audience?.exclusions}</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Traffic Size</p>
            <p className="text-lg font-bold text-teal-800">{analysis.target_audience?.size_estimate}</p>
          </div>
        </div>
      </Section>

      {/* Risk Analysis */}
      <Section icon={<Shield size={18} className="text-orange-600" />} title="Risk Analysis" defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RiskBadge level={analysis.risk_analysis?.risk_level} />
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-orange-700 mb-2">Potential Negative Effects</p>
            <ul className="space-y-1">
              {(analysis.risk_analysis?.potential_negatives || []).map((r, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">⚠</span> {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Rollback Plan</p>
              <p className="text-sm text-gray-700">{analysis.risk_analysis?.rollback_plan}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Mitigation</p>
              <p className="text-sm text-gray-700">{analysis.risk_analysis?.mitigation}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Expected Impact */}
      <Section icon={<TrendingUp size={18} className="text-blue-600" />} title="Expected Business Impact" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Traffic Impact', value: analysis.expected_impact?.traffic_impact, color: 'blue' },
            { label: 'Transaction Impact', value: analysis.expected_impact?.transaction_impact, color: 'green' },
            { label: 'UX Impact', value: analysis.expected_impact?.user_experience_impact, color: 'purple' },
            { label: 'Time to Results', value: analysis.expected_impact?.timeline_to_results, color: 'orange' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
              <p className="text-sm text-gray-800">{item.value || '—'}</p>
            </div>
          ))}
        </div>
        {analysis.implementation_notes && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">Engineering Notes</p>
            <p className="text-sm text-gray-700">{analysis.implementation_notes}</p>
          </div>
        )}
      </Section>
    </div>
  )
}
