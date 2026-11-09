import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { NotFoundPage, RouteErrorPage } from './RouteErrorPage'

function renderAt(path: string) {
  function Broken(): never {
    throw new Error('page failed')
  }
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { path: '/broken', element: <Broken /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('RouteErrorPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('says an unknown address was not found, with a way home and no retry', () => {
    renderAt('/no-such-page')

    expect(
      screen.getByRole('heading', { name: "We couldn't find what you were looking for." }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go back home' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers to try again when a page fails, instead of the router developer screen', () => {
    renderAt('/broken')

    expect(
      screen.getByRole('heading', { name: 'Something went wrong. Please try again.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument()
  })

  it('is translated', async () => {
    await i18n.changeLanguage('si')
    renderAt('/no-such-page')

    expect(
      screen.getByRole('heading', { name: 'ඔබ සොයන දෙය සොයාගත නොහැකි විය.' }),
    ).toBeInTheDocument()
  })
})
