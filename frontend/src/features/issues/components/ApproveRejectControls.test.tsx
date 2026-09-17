import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import type { AdvisoryResponse } from '@/types/dto/advisories'
import { useApproveAdvisory, useRejectAdvisory } from '../hooks/useAdvisories'
import { ApproveRejectControls } from './ApproveRejectControls'

vi.mock('../hooks/useAdvisories', () => ({
  useApproveAdvisory: vi.fn(),
  useRejectAdvisory: vi.fn(),
}))

const approveMutate = vi.fn()
const rejectMutate = vi.fn()

function advisory(overrides: Partial<AdvisoryResponse> = {}): AdvisoryResponse {
  return {
    advisoryId: 9,
    issueId: 1,
    issueTitle: 'Yellow mottled leaves',
    status: 'Draft',
    riskLevel: 'Medium',
    recommendation: 'Likely cause(s): Cassava mosaic disease.',
    confidenceScore: 0.7,
    requiresApproval: true,
    issueDescription: 'd',
    issueSeverity: 'Medium',
    issueStatus: 'AwaitingReview',
    issueCreatedAt: '2026-09-17T10:00:00Z',
    cropType: 'Cassava',
    variety: '',
    district: 'Kandy',
    reporterName: 'Farmer',
    photos: [],
    photoDiagnosis: {
      diseaseKey: 'cassava_mosaic_disease',
      diseaseName: 'Cassava mosaic disease',
      modelConfidence: 0.97,
      escalationReasons: ['SeriousDisease'],
      diseaseOptions: [
        { key: 'cassava_mosaic_disease', name: 'Cassava mosaic disease' },
        { key: 'cassava_brown_streak_disease', name: 'Cassava brown streak disease' },
        { key: 'other', name: 'Other (not in the list)' },
      ],
    },
    ...overrides,
  }
}

function renderControls(value: AdvisoryResponse) {
  render(
    <ApproveRejectControls
      advisory={value}
      shakeTrigger={false}
      onApproved={vi.fn()}
      onRejected={vi.fn()}
    />,
  )
}

describe('ApproveRejectControls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    approveMutate.mockReset()
    rejectMutate.mockReset()
    vi.mocked(useApproveAdvisory).mockReturnValue({
      mutate: approveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useApproveAdvisory>)
    vi.mocked(useRejectAdvisory).mockReturnValue({
      mutate: rejectMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRejectAdvisory>)
  })

  it('will not confirm held-back photo advice without the treatment for the farmer', async () => {
    renderControls(advisory())

    await userEvent.click(screen.getByRole('button', { name: 'Confirm diagnosis' }))

    expect(screen.getByText('Add the treatment the farmer should follow.')).toBeInTheDocument()
    expect(approveMutate).not.toHaveBeenCalled()
  })

  it("confirms held-back photo advice with the officer's treatment", async () => {
    renderControls(advisory())

    await userEvent.type(
      screen.getByLabelText('Treatment for the farmer'),
      'Uproot infected plants.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirm diagnosis' }))

    expect(approveMutate).toHaveBeenCalledWith(
      { note: undefined, treatment: 'Uproot infected plants.', diseaseKey: undefined },
      expect.anything(),
    )
  })

  it('confirms preliminary advice without a treatment, since the farmer already has advice', async () => {
    renderControls(advisory({ status: 'Preliminary' }))

    expect(
      screen.getByLabelText(
        'Treatment for the farmer (optional — replaces the preliminary advice)',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm diagnosis' }))

    expect(approveMutate).toHaveBeenCalledWith(
      { note: undefined, treatment: undefined, diseaseKey: undefined },
      expect.anything(),
    )
  })

  it('points to Correct diagnosis when a different disease is chosen before confirming', async () => {
    renderControls(advisory({ status: 'Preliminary' }))

    await userEvent.selectOptions(
      screen.getByLabelText('Correct disease (only if the photo diagnosis is wrong)'),
      'cassava_brown_streak_disease',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirm diagnosis' }))

    expect(screen.getByText('To change the diagnosis, use Correct diagnosis.')).toBeInTheDocument()
    expect(approveMutate).not.toHaveBeenCalled()
  })

  it('needs both the correct disease and a treatment to correct a diagnosis', async () => {
    renderControls(advisory())

    await userEvent.click(screen.getByRole('button', { name: 'Correct diagnosis' }))

    expect(
      screen.getByText('Choose the correct disease to correct the diagnosis.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Add the treatment the farmer should follow.')).toBeInTheDocument()
    expect(rejectMutate).not.toHaveBeenCalled()
  })

  it('sends the correct disease, treatment and note when correcting', async () => {
    renderControls(advisory())

    await userEvent.selectOptions(
      screen.getByLabelText('Correct disease (only if the photo diagnosis is wrong)'),
      'cassava_brown_streak_disease',
    )
    await userEvent.type(screen.getByLabelText('Treatment for the farmer'), 'Use clean cuttings.')
    await userEvent.type(screen.getByLabelText('Add a note (optional)'), 'Roots checked.')
    await userEvent.click(screen.getByRole('button', { name: 'Correct diagnosis' }))

    expect(rejectMutate).toHaveBeenCalledWith(
      {
        note: 'Roots checked.',
        treatment: 'Use clean cuttings.',
        diseaseKey: 'cassava_brown_streak_disease',
      },
      expect.anything(),
    )
  })

  it('keeps plain approve and reject for an advisory without a photo diagnosis', async () => {
    renderControls(advisory({ photoDiagnosis: null }))

    expect(screen.queryByLabelText('Treatment for the farmer')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(rejectMutate).toHaveBeenCalledWith(
      { note: undefined, treatment: undefined, diseaseKey: undefined },
      expect.anything(),
    )
  })
})
