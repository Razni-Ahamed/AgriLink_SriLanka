import { createBrowserRouter } from 'react-router-dom'
import { AdminLoginPage } from '@/auth/AdminLoginPage'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { farmsRoutes } from '@/features/farms/routes'
import { issuesRoutes } from '@/features/issues/routes'
import { marketplacePublicRoutes, marketplaceRoutes } from '@/features/marketplace/routes'
import { ordersRoutes } from '@/features/orders/routes'
import { AppLayout } from './AppLayout'
import { RequireAuth } from './RequireAuth'
import { RoleHomeRedirect } from './RoleHomeRedirect'
import { UnauthorizedPage } from './UnauthorizedPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    // AppLayout wraps RequireAuth (not the reverse) so a public route — like the
    // marketplace browse page, which the backend serves without auth — can render
    // with the same nav/header chrome as the rest of the app for anonymous visitors.
    element: <AppLayout />,
    children: [
      ...marketplacePublicRoutes,
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <RoleHomeRedirect /> },
          // Each feature's own routes.tsx wraps its sub-routes in RequireRole scoped to
          // exactly what its backend endpoints authorize (see the comments there) — no
          // single coarse role list here, since farms/issues/marketplace mix Farmer-only,
          // Officer-only, and shared sub-routes that a single wrapper can't tell apart.
          ...farmsRoutes,
          ...issuesRoutes,
          ...marketplaceRoutes,
          ...ordersRoutes,
          { path: '/unauthorized', element: <UnauthorizedPage /> },
        ],
      },
    ],
  },
])
