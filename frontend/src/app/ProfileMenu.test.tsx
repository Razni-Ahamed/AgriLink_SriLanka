import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/auth/authStore'
import { farmerProfile } from '@/test/profileFixtures'
import { ProfileMenu } from './ProfileMenu'

function CurrentLocation() {
  const location = useLocation()
  const background = (location.state as { backgroundLocation?: { pathname: string } } | null)?.backgroundLocation
  return (
    <p data-testid="location">
      {location.pathname}
      {background ? ` over ${background.pathname}` : ''}
    </p>
  )
}

function renderMenu(user = farmerProfile()) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Login page</p> },
      {
        path: '*',
        element: (
          <>
            <ProfileMenu user={user} />
            <button type="button">Somewhere else</button>
            <CurrentLocation />
          </>
        ),
      },
    ],
    { initialEntries: ['/farms'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('ProfileMenu', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', user: farmerProfile(), isHydrated: true })
  })

  afterEach(() => {
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('shows the avatar and display name', () => {
    renderMenu(farmerProfile({ displayName: 'Nimal P.' }))

    const button = screen.getByRole('button', { name: 'Account menu for Nimal P.' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveTextContent('Nimal P.')
  })

  it('falls back to the full name when there is no display name', () => {
    renderMenu()

    expect(screen.getByRole('button', { name: 'Account menu for Nimal Perera' })).toBeInTheDocument()
  })

  it('opens on click with focus on the first item, and arrow keys move between items', async () => {
    const user = userEvent.setup()
    renderMenu()
    const button = screen.getByRole('button', { name: /Account menu/ })

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus()
  })

  it('opens from the keyboard with ArrowDown', async () => {
    const user = userEvent.setup()
    renderMenu()

    screen.getByRole('button', { name: /Account menu/ }).focus()
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus()
  })

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup()
    renderMenu()
    const button = screen.getByRole('button', { name: /Account menu/ })
    await user.click(button)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes when clicking outside it', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /Account menu/ }))

    await user.click(screen.getByRole('button', { name: 'Somewhere else' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('"My profile" opens the profile route over the current page', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /Account menu/ }))

    await user.click(screen.getByRole('menuitem', { name: 'My profile' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/profile over /farms')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('"Log out" ends the session and goes to the login page', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /Account menu/ }))

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
