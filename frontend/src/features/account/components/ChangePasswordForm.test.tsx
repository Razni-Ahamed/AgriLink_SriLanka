import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { ChangePasswordForm } from './ChangePasswordForm'

describe('ChangePasswordForm', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('rejects a new password that fails the complexity policy and never calls onSubmit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChangePasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Current password'), 'CurrentPass@123')
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(await screen.findByText('Password must be at least 12 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a new password missing a symbol', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChangePasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Current password'), 'CurrentPass@123')
    await user.type(screen.getByLabelText('New password'), 'NoSymbolPassword123')
    await user.type(screen.getByLabelText('Confirm new password'), 'NoSymbolPassword123')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(await screen.findByText('Password must include a symbol')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a confirmation that does not match the new password', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChangePasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Current password'), 'CurrentPass@123')
    await user.type(screen.getByLabelText('New password'), 'ValidPassword@123')
    await user.type(screen.getByLabelText('Confirm new password'), 'DifferentPassword@123')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    expect(await screen.findByText('Passwords must match')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits once the new password meets the policy and the confirmation matches', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ChangePasswordForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Current password'), 'CurrentPass@123')
    await user.type(screen.getByLabelText('New password'), 'ValidPassword@123')
    await user.type(screen.getByLabelText('Confirm new password'), 'ValidPassword@123')
    await user.click(screen.getByRole('button', { name: 'Change Password' }))

    // react-hook-form's handleSubmit calls the success handler as (data, event) — only the
    // first argument is this form's own contract.
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      currentPassword: 'CurrentPass@123',
      newPassword: 'ValidPassword@123',
      confirmNewPassword: 'ValidPassword@123',
    })
  })
})
