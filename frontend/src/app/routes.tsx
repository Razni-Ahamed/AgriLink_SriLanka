import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { lazyPage } from '@/lib/lazyPage'
import { AppLayout } from './AppLayout'
import { HomeRoute } from './HomeRoute'
import { pageRoutes } from './pageRoutes'
import { PageLoading, RouteErrorPage } from './RouteErrorPage'

const AdminLoginPage = lazyPage(() => import('@/auth/AdminLoginPage'), 'AdminLoginPage')
const LoginPage = lazyPage(() => import('@/auth/LoginPage'), 'LoginPage')
const RegisterPage = lazyPage(() => import('@/auth/RegisterPage'), 'RegisterPage')

/** The sign-in pages sit outside AppLayout, so each brings its own loading state. */
function standalone(page: ReactNode) {
  return <Suspense fallback={<PageLoading />}>{page}</Suspense>
}

export const router = createBrowserRouter([
  // Outside AppLayout: the landing page has its own header, and it isn't behind RequireAuth.
  { path: '/', element: <HomeRoute />, errorElement: <RouteErrorPage /> },
  { path: '/login', element: standalone(<LoginPage />), errorElement: <RouteErrorPage /> },
  {
    path: '/admin/login',
    element: standalone(<AdminLoginPage />),
    errorElement: <RouteErrorPage />,
  },
  { path: '/register', element: standalone(<RegisterPage />), errorElement: <RouteErrorPage /> },
  {
    // AppLayout wraps RequireAuth (not the reverse) so a public route — like the
    // marketplace browse page, which the backend serves without auth — can render
    // with the same nav/header chrome as the rest of the app for anonymous visitors.
    // It also holds the `*` route, so an unknown address gets a "not found" page with the header.
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: pageRoutes,
  },
])
