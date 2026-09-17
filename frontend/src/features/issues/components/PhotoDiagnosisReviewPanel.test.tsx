import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/config'
import type { AdvisoryResponse } from '@/types/dto/advisories'
import { PhotoDiagnosisReviewPanel } from './PhotoDiagnosisReviewPanel'

function advisory(overrides: Partial<AdvisoryResponse> = {}): AdvisoryResponse {
  return {
    advisoryId: 1,
    issueId: 1,
    issueTitle: 't',
    status: 'Draft',
    riskLevel: 'Medium',
    recommendation: 'r',
    confidenceScore: 0.7,
    requiresApproval: true,
    issueDescription: 'd',
    issueSeverity: 'Medium',
    issueStatus: 'AwaitingReview',
    issueCreatedAt: '2026-09-17T10:00:00Z',
    cropType: 'Cassava',
    variety: '',
    district: 'Kandy',
    reporterName: '',
    photos: [],
    photoDiagnosis: {
      diseaseKey: 'cassava_mosaic_disease',
      diseaseName: 'Cassava mosaic disease',
      modelConfidence: 0.973,
      modelVersion: 'cassava-20260917-125705',
      escalationReasons: ['SeriousDisease', 'LowConfidence', 'SomeFutureReason'],
    },
    ...overrides,
  }
}

describe('PhotoDiagnosisReviewPanel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the diagnosis, confidence, model and each reason it was held back', () => {
    render(<PhotoDiagnosisReviewPanel advisory={advisory()} />)

    expect(screen.getByText('Identified: Cassava mosaic disease')).toBeInTheDocument()
    expect(screen.getByText('97% model confidence')).toBeInTheDocument()
    expect(screen.getByText('Model cassava-20260917-125705')).toBeInTheDocument()
    expect(
      screen.getByText('This disease is marked serious and always needs an officer.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "The model's confidence is below the level needed to advise the farmer automatically.",
      ),
    ).toBeInTheDocument()
    // A reason code this version of the app does not know yet is shown as-is, not dropped.
    expect(screen.getByText('SomeFutureReason')).toBeInTheDocument()
  })

  it('warns that preliminary advice has already reached the farmer', () => {
    render(
      <PhotoDiagnosisReviewPanel
        advisory={advisory({
          status: 'Preliminary',
          photoDiagnosis: {
            diseaseKey: 'k',
            diseaseName: 'Cassava mosaic disease',
            escalationReasons: [],
          },
        })}
      />,
    )

    expect(screen.getByText(/Preliminary advice has already been sent/)).toBeInTheDocument()
    expect(screen.queryByText('Why this needs your review')).not.toBeInTheDocument()
  })

  it('renders nothing for an advisory without a photo diagnosis', () => {
    const { container } = render(
      <PhotoDiagnosisReviewPanel advisory={advisory({ photoDiagnosis: null })} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
