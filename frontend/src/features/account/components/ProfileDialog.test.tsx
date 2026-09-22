import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { farmerProfile } from '@/test/profileFixtures'
import { ProfileDialog, type ProfileTab } from './ProfileDialog'

interface HarnessProps {
  onClose?: () => void
  initialTab?: ProfileTab
}

function Harness({ onClose = () => {}, initialTab = 'general' }: HarnessProps) {
  const [tab, setTab] = useState<ProfileTab>(initialTab)
  return (
    <>
      <button type="button">Opener</button>
      <ProfileDialog open tab={tab} onTabChange={setTab} onClose={onClose} user={farmerProfile()} />
    </>
  )
}

function renderDialog(props: HarnessProps = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>,
  )
}

describe('ProfileDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('is a labelled modal dialog with two tabs, General selected', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'My profile' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('tablist', { name: 'Profile settings' })).toBeInTheDocument()
    const general = screen.getByRole('tab', { name: 'General settings' })
    const security = screen.getByRole('tab', { name: 'Security settings' })
    expect(general).toHaveAttribute('aria-selected', 'true')
    expect(security).toHaveAttribute('aria-selected', 'false')
    expect(general).toHaveAttribute('tabindex', '0')
    expect(security).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel', { name: 'General settings' })).toBeInTheDocument()
  })

  it('moves focus into the dialog when it opens', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('switches tabs with the arrow keys, Home and End, and shows the matching panel', async () => {
    const user = userEvent.setup()
    renderDialog()
    screen.getByRole('tab', { name: 'General settings' }).focus()

    await user.keyboard('{ArrowRight}')
    const security = screen.getByRole('tab', { name: 'Security settings' })
    expect(security).toHaveFocus()
    expect(security).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Security settings' })).toBeInTheDocument()
    // The Security tab keeps the existing password change working until Part B replaces it.
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}') // wraps around
    expect(screen.getByRole('tab', { name: 'General settings' })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Security settings' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'General settings' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Security settings' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches tabs on click', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Security settings' }))

    expect(screen.getByRole('tabpanel', { name: 'Security settings' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onClose })

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab focus inside the dialog in both directions', async () => {
    const user = userEvent.setup()
    renderDialog({ initialTab: 'security' })
    const dialog = screen.getByRole('dialog')

    for (let step = 0; step < 12; step++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    for (let step = 0; step < 12; step++) {
      await user.tab({ shift: true })
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    expect(screen.getByRole('button', { name: 'Opener' })).not.toHaveFocus()
  })

  it('shows the General summary, with notes on the fields changed elsewhere', () => {
    renderDialog()

    expect(screen.getByText('nimal@agrilink.lk')).toBeInTheDocument()
    expect(screen.getByText('PLOT-42')).toBeInTheDocument()
    expect(screen.getByText('199912345678')).toBeInTheDocument()
    expect(screen.getAllByText('Change this in Security settings.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contact an administrator to change this.').length).toBeGreaterThan(0)
    expect(screen.getByText('You can change your username now.')).toBeInTheDocument()
  })
})
