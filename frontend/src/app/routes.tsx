import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { farmsRoutes } from '@/features/farms/routes'
import { issuesRoutes } from '@/features/issues/routes'
import { marketplaceRoutes } from '@/features/marketplace/routes'
import { ordersRoutes } from '@/features/orders/routes'
import { AppLayout } from './AppLayout'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { RoleHomeRedirect } from './RoleHomeRedirect'
import { UnauthorizedPage } from './UnauthorizedPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <RoleHomeRedirect /> },
          { element: <RequireRole allow={['Farmer', 'Admin']} />, children: farmsRoutes },
          {
            element: <RequireRole allow={['Farmer', 'Officer', 'Admin']} />,
            children: issuesRoutes,
          },
          {
            element: <RequireRole allow={['Farmer', 'Buyer', 'Admin']} />,
            children: marketplaceRoutes,
          },
          {
            element: <RequireRole allow={['Farmer', 'Buyer', 'Officer', 'Admin']} />,
            children: ordersRoutes,
          },
          { path: '/unauthorized', element: <UnauthorizedPage /> },
        ],
      },
    ],
  },
])
