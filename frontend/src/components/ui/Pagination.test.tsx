import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the current page and total', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />)

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('disables Previous on the first page and calls back with the next page otherwise', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables Next on the last page and calls back with the previous page otherwise', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={3} totalPages={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables both buttons when there is only one page', () => {
    render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('disables both buttons when the disabled prop is set, regardless of page', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} disabled />)

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})
