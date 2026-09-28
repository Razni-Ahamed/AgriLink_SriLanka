import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/auth/authStore'
import { farmerProfile } from '@/test/profileFixtures'
import { LogoutButton, ProfileButton } from './AccountButtons'

function CurrentLocation() {
  const location = useLocation()
  const background = (location.state as { backgroundLocation?: { pathname: string } } | null)
    ?.backgroundLocation
  return (
    <p data-testid="location">
      {location.pathname}
      {background ? ` over ${background.pathname}` : ''}
    </p>
  )
}

function renderButtons(user = farmerProfile()) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Home page</p> },
      {
        path: '*',
        element: (
          <>
            <ProfileButton user={user} />
            <LogoutButton />
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

describe('account buttons', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', user: farmerProfile(), isHydrated: true })
  })

  afterEach(() => {
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('names the profile button after the user, falling back to the full name', () => {
    renderButtons(farmerProfile({ displayName: 'Nimal P.' }))
    expect(screen.getByRole('button', { name: 'My profile (Nimal P.)' })).toBeInTheDocument()
  })

  it('opens the profile pop-up over the current page in one click', async () => {
    const user = userEvent.setup()
    renderButtons()

    await user.click(screen.getByRole('button', { name: 'My profile (Nimal Perera)' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/profile over /farms')
  })

  it('"Log out" ends the session and goes to the home page', async () => {
    const user = userEvent.setup()
    renderButtons()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
