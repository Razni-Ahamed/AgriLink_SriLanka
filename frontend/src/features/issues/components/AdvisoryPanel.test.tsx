import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/config'
import type { AdvisoryResponse } from '@/types/dto/advisories'
import { getIssuePhoto } from '../api/issuesApi'
import { AdvisoryPanel } from './AdvisoryPanel'

vi.mock('../api/issuesApi', () => ({ getIssuePhoto: vi.fn() }))

const aiRecommendation =
  'Likely cause(s): Cassava mosaic disease. Suggested next steps: uproot plants.'

function advisory(overrides: Partial<AdvisoryResponse> = {}): AdvisoryResponse {
  return {
    advisoryId: 1,
    issueId: 1,
    issueTitle: 'Yellow mottled leaves',
    status: 'Preliminary',
    riskLevel: 'Medium',
    recommendation: aiRecommendation,
    confidenceScore: 0.7,
    requiresApproval: true,
    issueDescription: 'Leaves are twisted with yellow patches.',
    issueSeverity: 'Medium',
    issueStatus: 'AwaitingReview',
    issueCreatedAt: '2026-09-17T10:00:00Z',
    cropType: 'Cassava',
    variety: 'MU 51',
    district: 'Kandy',
    reporterName: '',
    photoDiagnosis: { diseaseKey: 'cassava_mosaic_disease', diseaseName: 'Cassava mosaic disease' },
    photos: [{ imageId: 7, url: '/api/issues/1/images/7', width: 800, height: 600 }],
    ...overrides,
  }
}

describe('AdvisoryPanel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:photo'),
      revokeObjectURL: vi.fn(),
    })
    vi.mocked(getIssuePhoto).mockResolvedValue(
      new Blob([new Uint8Array(4)], { type: 'image/jpeg' }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tells a farmer that preliminary advice is still to be confirmed', async () => {
    render(<AdvisoryPanel advisory={advisory()} audience="farmer" />)

    expect(screen.getByRole('note')).toHaveTextContent('Preliminary advice')
    expect(
      screen.getByText('Identified from the photo: Cassava mosaic disease'),
    ).toBeInTheDocument()
    expect(screen.getByText(aiRecommendation)).toBeInTheDocument()
    expect(await screen.findByAltText('Photo attached to this report')).toHaveAttribute(
      'src',
      'blob:photo',
    )
    expect(getIssuePhoto).toHaveBeenCalledWith('/api/issues/1/images/7', expect.any(AbortSignal))
  })

  it("shows a farmer only the officer's advice once the officer has replaced the AI's", () => {
    render(
      <AdvisoryPanel
        audience="farmer"
        advisory={advisory({
          status: 'Rejected',
          confirmedDiseaseKey: 'cassava_brown_streak_disease',
          confirmedDiseaseName: 'Cassava brown streak disease',
          officerTreatment: 'Destroy affected plants and use certified cuttings.',
          photos: [],
        })}
      />,
    )

    expect(screen.getByText("Officer's advice")).toBeInTheDocument()
    expect(
      screen.getByText('Destroy affected plants and use certified cuttings.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Officer's diagnosis: Cassava brown streak disease"),
    ).toBeInTheDocument()
    expect(screen.queryByText(aiRecommendation)).not.toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it("keeps the AI's recommendation for a reviewer, alongside the officer's advice", () => {
    render(
      <AdvisoryPanel
        audience="reviewer"
        advisory={advisory({ status: 'Rejected', officerTreatment: 'Officer advice.', photos: [] })}
      />,
    )

    expect(screen.getByText(aiRecommendation)).toBeInTheDocument()
    expect(screen.getByText('Officer advice.')).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('shows that a photo could not be loaded instead of a broken image', async () => {
    vi.mocked(getIssuePhoto).mockRejectedValue(new Error('503'))

    render(<AdvisoryPanel advisory={advisory()} audience="farmer" />)

    expect(await screen.findByText('Photo unavailable')).toBeInTheDocument()
  })
})
