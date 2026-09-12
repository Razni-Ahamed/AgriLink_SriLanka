import type { IssueSeverity, IssueStatus } from './issues'

export type AdvisoryStatus = 'Draft' | 'Approved' | 'Rejected'
export type RiskLevel = 'Low' | 'Medium' | 'High'

/** One prior issue on the same crop — triage context: "has this crop had this before?" */
export interface PreviousIssueSummary {
  issueId: number
  title: string
  severity: IssueSeverity
  status: IssueStatus
  createdAt: string
  advisoryId?: number
}

export type AgentExecutionStatus = 'Running' | 'Completed' | 'Failed'

/** One step of the AI pipeline that produced an advisory. Input/Output are whatever JSON that
 *  agent's step recorded — shape varies by agent, so callers render generically. */
export interface AgentStep {
  agentName: string
  status: AgentExecutionStatus
  startedAt: string
  completedAt?: string
  input?: unknown
  output?: unknown
}

export interface AgentTrace {
  objective: string
  status: AgentExecutionStatus
  startedAt: string
  completedAt?: string
  steps: AgentStep[]
}

export interface AdvisoryResponse {
  advisoryId: number
  issueId: number
  issueTitle: string
  status: AdvisoryStatus
  riskLevel: RiskLevel
  recommendation: string
  confidenceScore: number
  requiresApproval: boolean
  reviewedByFK?: number
  reviewedByName?: string
  reviewedAt?: string
  /** The reviewing officer's own note, if they left one when approving/rejecting. */
  reviewNote?: string

  // Full issue context, so a reviewer sees what was reported and by whom on this same panel.
  issueDescription: string
  issueSeverity: IssueSeverity
  issueStatus: IssueStatus
  issueCreatedAt: string
  cropType: string
  variety: string
  district: string
  reporterName: string

  /** Present only for an Officer/Admin caller — absent on a Farmer's own view of their advisory. */
  previousIssues?: PreviousIssueSummary[]
  /** Present only for an Officer/Admin caller. */
  agentTrace?: AgentTrace
}
