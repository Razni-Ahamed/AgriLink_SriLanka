import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { preparePhotoForUpload } from '../lib/preparePhoto'
import { PhotoPicker } from './PhotoPicker'

vi.mock('../lib/preparePhoto', () => ({ preparePhotoForUpload: vi.fn() }))

const prepare = vi.mocked(preparePhotoForUpload)

function Harness({ onChange }: { onChange: (file: File | undefined) => void }) {
  const [photo, setPhoto] = useState<File>()
  return (
    <PhotoPicker
      value={photo}
      onChange={(file) => {
        setPhoto(file)
        onChange(file)
      }}
    />
  )
}

describe('PhotoPicker', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
    prepare.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hands the form the prepared photo, not the original, and shows a preview', async () => {
    const original = new File([new Uint8Array(8_000_000)], 'IMG_1.png', { type: 'image/png' })
    const prepared = new File([new Uint8Array(300_000)], 'IMG_1.jpg', { type: 'image/jpeg' })
    prepare.mockResolvedValue({ ok: true, file: prepared })
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.upload(screen.getByLabelText('Photo (optional)'), original)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(prepared))
    expect(prepare).toHaveBeenCalledWith(original)
    expect(screen.getByAltText('Photo of the affected crop')).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument()
  })

  it('explains why a photo cannot be used and attaches nothing', async () => {
    prepare.mockResolvedValue({ ok: false, problem: 'unsupported' })
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.upload(
      screen.getByLabelText('Photo (optional)'),
      new File([new Uint8Array(10)], 'IMG.heic', { type: 'image/heic' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent("This photo format can't be used")
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByAltText('Photo of the affected crop')).not.toBeInTheDocument()
  })

  it('removes an attached photo', async () => {
    const prepared = new File([new Uint8Array(10)], 'leaf.jpg', { type: 'image/jpeg' })
    prepare.mockResolvedValue({ ok: true, file: prepared })
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.upload(screen.getByLabelText('Photo (optional)'), prepared)
    await screen.findByAltText('Photo of the affected crop')

    await userEvent.click(screen.getByRole('button', { name: /remove photo/i }))

    expect(onChange).toHaveBeenLastCalledWith(undefined)
    expect(screen.queryByAltText('Photo of the affected crop')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add a photo/i })).toBeInTheDocument()
  })
})
