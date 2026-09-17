import type { IssueSeverity, IssueStatus } from './issues'

/** Preliminary: advice from a confident photo diagnosis, already shown to the farmer and still
 *  awaiting an officer's confirmation. */
export type AdvisoryStatus = 'Draft' | 'Preliminary' | 'Approved' | 'Rejected'
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

  /** What the photo model identified; absent when the report had no photo diagnosis. */
  photoDiagnosis?: PhotoDiagnosis | null
  /** The disease the reviewing officer confirmed, or corrected the diagnosis to. */
  confirmedDiseaseKey?: string | null
  confirmedDiseaseName?: string | null
  /** The officer's own treatment; when present it replaces the AI-drafted advice. */
  officerTreatment?: string | null
  /** Photos the farmer attached. Each url is an authenticated API path — fetch it with the API client. */
  photos: IssuePhoto[]
}

export interface PhotoDiagnosis {
  diseaseKey: string
  diseaseName: string
  /** Officer/Admin only: the model's calibrated probability for the predicted disease. */
  modelConfidence?: number | null
  /** Officer/Admin only. */
  modelVersion?: string | null
  /** Officer/Admin only: codes for why the diagnosis was held for an officer. */
  escalationReasons?: string[] | null
  /** Officer/Admin only: what the diagnosis can be corrected to. */
  diseaseOptions?: DiseaseOption[] | null
}

/** Body for approve/reject. For a photo diagnosis the backend requires a treatment when
 *  approving held-back (Draft) advice, and a diseaseKey plus treatment when rejecting. */
export interface ReviewAdvisoryRequest {
  note?: string
  /** Reject only: the correct disease — a DiseaseOption key, or "other". */
  diseaseKey?: string
  treatment?: string
}

export interface DiseaseOption {
  key: string
  name: string
}

export interface IssuePhoto {
  imageId: number
  url: string
  width: number
  height: number
}
