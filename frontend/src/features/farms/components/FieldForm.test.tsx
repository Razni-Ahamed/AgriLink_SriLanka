import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { FieldForm } from './FieldForm'

describe('FieldForm', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows why the server refused the last save', () => {
    render(
      <FieldForm
        submitLabel="Add Field"
        onSubmit={vi.fn()}
        error="A field can't be larger than its farm."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent("A field can't be larger than its farm.")
  })

  it('shows no alert before anything has failed', () => {
    render(<FieldForm submitLabel="Add Field" onSubmit={vi.fn()} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still blocks an empty name on the client', async () => {
    const onSubmit = vi.fn()
    render(<FieldForm submitLabel="Add Field" onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add Field' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
