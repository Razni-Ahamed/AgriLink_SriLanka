import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { UserAvatar } from './UserAvatar'

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/agrilink/avatars/abc.jpg'

describe('UserAvatar', () => {
  it('shows the photo, with the person\'s name as alt text, for an https URL', () => {
    render(<UserAvatar photoUrl={PHOTO} role="Farmer" name="Nimal Perera" />)

    const image = screen.getByRole('img', { name: 'Nimal Perera' })
    expect(image.tagName).toBe('IMG')
    expect(image).toHaveAttribute('src', PHOTO)
  })

  it('shows the role default when there is no photo', () => {
    const { container } = render(<UserAvatar role="Buyer" name="Kumari Silva" />)

    const avatar = screen.getByRole('img', { name: 'Kumari Silva' })
    expect(avatar.tagName).toBe('SPAN')
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it.each([
    'http://res.cloudinary.com/demo/a.jpg',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    '/api/profile-photos/0123456789abcdef0123456789abcdef.jpg',
    'not a url',
  ])('ignores a non-https URL (%s) and shows the default instead', (photoUrl) => {
    const { container } = render(<UserAvatar photoUrl={photoUrl} role="Officer" name="Officer One" />)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Officer One' }).tagName).toBe('SPAN')
  })

  it('falls back to the default when the photo fails to load', () => {
    const { container } = render(<UserAvatar photoUrl={PHOTO} role="Admin" name="Site Admin" />)

    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: 'Site Admin' }).tagName).toBe('SPAN')
  })

  it('tries again when the URL changes after a failure', () => {
    const { container, rerender } = render(<UserAvatar photoUrl={PHOTO} role="Farmer" name="Nimal" />)
    fireEvent.error(container.querySelector('img')!)

    rerender(<UserAvatar photoUrl={`${PHOTO}?v=2`} role="Farmer" name="Nimal" />)

    expect(container.querySelector('img')).toHaveAttribute('src', `${PHOTO}?v=2`)
  })

  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 64],
    ['xl', 112],
  ] as const)('renders the %s size at %ipx', (size, px) => {
    const { container } = render(<UserAvatar role="Farmer" name="Nimal" size={size} />)

    expect(container.querySelector('svg')).toHaveAttribute('width', String(px))
  })
})
