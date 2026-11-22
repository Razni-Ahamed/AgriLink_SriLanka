import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { useMyCrops } from '@/features/farms/hooks/useCrops'
import { useCreateIssue } from '../hooks/useIssues'
import { queueIssueReport } from '../lib/issueOutbox'
import { NewIssuePage } from './NewIssuePage'

vi.mock('@/lib/apiClient', () => ({ apiClient: {} }))
vi.mock('@/features/farms/hooks/useCrops', () => ({ useMyCrops: vi.fn() }))
vi.mock('../hooks/useIssues', () => ({ useCreateIssue: vi.fn() }))
vi.mock('../hooks/useIssueOutbox', () => ({ useOutboxOwner: () => '7' }))
vi.mock('../lib/issueOutbox', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/issueOutbox')>()),
  queueIssueReport: vi.fn().mockResolvedValue(undefined),
}))

const mutate = vi.fn()

function renderPage() {
  vi.mocked(useMyCrops).mockReturnValue({
    data: [
      {
        cropId: 1,
        cropType: 'Carrot',
        variety: '',
        fieldName: 'North',
        farmName: 'Hill farm',
      },
    ],
    isLoading: false,
  } as unknown as ReturnType<typeof useMyCrops>)
  vi.mocked(useCreateIssue).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
    typeof useCreateIssue
  >)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/issues/new?cropId=1']}>
        <Routes>
          <Route path="/issues/new" element={<NewIssuePage />} />
          <Route path="/issues/mine" element={<p>My issues page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Title'), 'Yellow leaves')
  await user.type(screen.getByLabelText('Description'), 'Mottled patches')
  await user.click(screen.getByRole('button', { name: 'Report Issue' }))
}

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
}

describe('reporting an issue with no signal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    mutate.mockReset()
    vi.mocked(queueIssueReport).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves the report to send later instead of trying to send it', async () => {
    setOnline(false)
    renderPage()

    await fillAndSubmit()

    expect(mutate).not.toHaveBeenCalled()
    expect(queueIssueReport).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({
        cropId: 1,
        title: 'Yellow leaves',
        description: 'Mottled patches',
      }),
    )
    expect(await screen.findByText('My issues page')).toBeInTheDocument()
  })

  it('saves the report when the signal drops while sending', async () => {
    setOnline(true)
    mutate.mockImplementation((_values, { onError }) =>
      onError(new AxiosError('Network Error', AxiosError.ERR_NETWORK)),
    )
    renderPage()

    await fillAndSubmit()

    expect(queueIssueReport).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('My issues page')).toBeInTheDocument()
  })

  it('does not save a report the server refused', async () => {
    setOnline(true)
    const config = { headers: new AxiosHeaders() }
    mutate.mockImplementation((_values, { onError }) =>
      onError(
        new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, null, {
          status: 400,
          statusText: '',
          headers: {},
          config,
          data: {},
        }),
      ),
    )
    renderPage()

    await fillAndSubmit()

    expect(queueIssueReport).not.toHaveBeenCalled()
    expect(screen.queryByText('My issues page')).not.toBeInTheDocument()
  })
})
