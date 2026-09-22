import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { PasswordChecklist } from './PasswordChecklist'

describe('PasswordChecklist', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows every rule as neutral (not met/unmet) before the user has typed anything', () => {
    render(<PasswordChecklist password="" />)

    expect(screen.getByText('At least 12 characters').closest('li')).not.toHaveClass('text-state-danger')
    expect(screen.getByText('At least 12 characters').closest('li')).not.toHaveClass('text-state-success')
    expect(screen.getAllByText('(not yet checked)', { exact: false }).length).toBeGreaterThan(0)
  })

  it('marks satisfied rules as met and the rest as not met once the user has typed', () => {
    render(<PasswordChecklist password="short" />)

    // "short" is 5 chars (fails length), has a lowercase letter (passes), no upper/digit/symbol.
    expect(screen.getByText('At least 12 characters').closest('li')).toHaveClass('text-state-danger')
    expect(screen.getByText('Contains a lowercase letter').closest('li')).toHaveClass('text-state-success')
    expect(screen.getByText('Contains an uppercase letter').closest('li')).toHaveClass('text-state-danger')
  })

  it('marks every rule as met for a password that satisfies the full policy', () => {
    render(<PasswordChecklist password="Password@123!" />)

    for (const label of [
      'At least 12 characters',
      'Contains a lowercase letter',
      'Contains an uppercase letter',
      'Contains a number',
      'Contains a symbol (e.g. ! @ # $)',
    ]) {
      expect(screen.getByText(label).closest('li')).toHaveClass('text-state-success')
    }
  })

  it('exposes an accessible name and per-row met/not-met text for screen readers', () => {
    render(<PasswordChecklist password="short" />)

    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument()
    expect(screen.getAllByText('(met)', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('(not met)', { exact: false }).length).toBeGreaterThan(0)
  })

  it('links to the input via the given id', () => {
    render(<PasswordChecklist password="" id="my-checklist" />)
    expect(document.getElementById('my-checklist')).toBeInTheDocument()
  })
})
