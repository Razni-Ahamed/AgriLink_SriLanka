import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipGroup } from './ChipGroup'

function Harness() {
  const [value, setValue] = useState<'Farmer' | 'Buyer'>('Farmer')
  return (
    <ChipGroup
      label="Account type"
      value={value}
      onChange={setValue}
      options={[
        { value: 'Farmer', label: 'Farmer' },
        { value: 'Buyer', label: 'Buyer' },
      ]}
    />
  )
}

describe('ChipGroup', () => {
  it('names the group and marks exactly the selected chip as pressed', () => {
    render(<Harness />)

    expect(screen.getByRole('group', { name: 'Account type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Farmer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Buyer' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('moves the selection when another chip is chosen', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Buyer' }))

    expect(screen.getByRole('button', { name: 'Buyer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Farmer' })).toHaveAttribute('aria-pressed', 'false')
  })
})
