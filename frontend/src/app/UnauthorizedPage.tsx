import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="font-display text-2xl text-brand-forest">
        You don't have access to this page
      </h1>
      <p className="text-text-secondary">Your account role doesn't allow this section.</p>
      <Link to="/" className="mt-4 text-brand-forest hover:underline">
        Go back home
      </Link>
    </div>
  )
}
