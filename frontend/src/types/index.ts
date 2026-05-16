export interface TicketSummary {
  id: number
  title: string
  status: string
  priority: string
  assignee: string
  project: string
  type: string
  created_at: string
  url: string
  activity_count: number
  attachment_count: number
}

export interface TestCase {
  id: string
  scenario: string
  preconditions?: string
  steps: string[]
  expected_result: string
  actual_result: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface EdgeCase {
  scenario: string
  why_it_matters: string
  how_to_test: string
}

export interface RCA {
  probable_cause: string
  technical_explanation: string
  impacted_modules: string[]
  data_flow_impact: string
  database_impact?: string
}

export interface SuggestedFix {
  approach: string
  code_areas: string[]
  implementation_steps: string[]
  estimated_effort: string
  testing_after_fix: string
}

export interface BugAnalysis {
  bug_summary: string
  test_cases: TestCase[]
  edge_cases: EdgeCase[]
  rca: RCA
  suggested_fix: SuggestedFix
  regression_checklist: string[]
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  severity_justification: string
  user_impact: string
  business_impact: string
}

export interface Variant {
  name: string
  description: string
  screenshot_description?: string
}

export interface MetricItem {
  name: string
  measurement: string
  baseline?: string
  threshold?: string
}

export interface StoryAnalysis {
  story_summary: string
  ab_testing_applicable: boolean
  ab_testing_justification: string
  hypothesis: string
  variants: {
    control: Variant
    treatment: Variant
    additional_variants?: Variant[]
  }
  metrics: {
    primary_metric: MetricItem
    secondary_metrics: MetricItem[]
    guardrail_metrics: MetricItem[]
  }
  success_criteria: {
    minimum_detectable_effect: string
    statistical_significance: string
    minimum_sample_size: string
    recommended_duration: string
    traffic_split: string
  }
  target_audience: {
    segment: string
    exclusions: string
    size_estimate: string
  }
  risk_analysis: {
    potential_negatives: string[]
    rollback_plan: string
    risk_level: 'Low' | 'Medium' | 'High'
    mitigation: string
  }
  expected_impact: {
    traffic_impact: string
    transaction_impact: string
    user_experience_impact: string
    timeline_to_results: string
  }
  implementation_notes?: string
}

export interface AnalysisResult {
  ticket_type: string
  ticket_summary: TicketSummary
  analysis: BugAnalysis | StoryAnalysis
  analysis_mode: 'bug' | 'story'
}

export interface NotificationResult {
  skipped?: boolean
  reason?: string
  error?: string
  results?: Array<{
    role: string
    email: string
    name: string
    sent_chat: boolean
    sent_email: boolean
  }>
}

export interface CreateTicketResult {
  success: boolean
  ticket_id: number
  ticket_url: string
  subject: string
  project: string
  type: string
  priority: string
  assignee: string | null
  accountable: string | null
  uploaded_files: string[]
  extraction_notes: string
  notifications?: NotificationResult
}

export type LoadingStep = {
  label: string
  done: boolean
  active: boolean
}
