import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from '@/i18n/config'
import type { PhotoDiagnosisSummaryResponse } from '@/types/dto/admin'
import { useDownloadConfirmedPhotos, usePhotoDiagnosisSummary } from '../hooks/useAdminMetrics'
import { PhotoDiagnosisPanel } from './PhotoDiagnosisPanel'

vi.mock('../hooks/useAdminMetrics', () => ({
  usePhotoDiagnosisSummary: vi.fn(),
  useDownloadConfirmedPhotos: vi.fn(),
}))

const mutate = vi.fn()

function mockSummary(summary: PhotoDiagnosisSummaryResponse) {
  vi.mocked(usePhotoDiagnosisSummary).mockReturnValue({
    data: summary,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof usePhotoDiagnosisSummary>)
  vi.mocked(useDownloadConfirmedPhotos).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useDownloadConfirmedPhotos>)
}

describe('PhotoDiagnosisPanel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    mutate.mockClear()
  })

  it('shows how often each model agreed with the officer and the most common corrections', () => {
    mockSummary({
      totalReviewed: 4,
      photosAvailable: 4,
      models: [
        {
          crop: 'Paddy',
          modelVersion: 'paddy-20261004-061637',
          reviewed: 4,
          agreed: 1,
          agreementRate: 0.25,
          confirmedOther: 1,
          topCorrections: [
            {
              predictedKey: 'paddy_bacterial_leaf_blight',
              predictedName: 'Paddy bacterial leaf blight',
              confirmedKey: 'paddy_tungro',
              confirmedName: 'Paddy tungro',
              count: 2,
            },
          ],
        },
      ],
    })

    render(<PhotoDiagnosisPanel />)

    const row = screen.getByText('paddy-20261004-061637').closest('tr')!
    expect(within(row).getByText('1 (25%)')).toBeInTheDocument()
    expect(within(row).getByText('Paddy bacterial leaf blight → Paddy tungro (2 times)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Download 4 confirmed photos/ }))
    expect(mutate).toHaveBeenCalled()
  })

  it('has nothing to download before any photo diagnosis is reviewed', () => {
    mockSummary({ totalReviewed: 0, photosAvailable: 0, models: [] })

    render(<PhotoDiagnosisPanel />)

    expect(screen.getByText('No photo diagnoses have been reviewed yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download 0 confirmed photos/ })).toBeDisabled()
  })
})
