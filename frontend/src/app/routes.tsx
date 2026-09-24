import { createBrowserRouter } from 'react-router-dom'
import { AdminLoginPage } from '@/auth/AdminLoginPage'
import { LoginPage } from '@/auth/LoginPage'
import { RegisterPage } from '@/auth/RegisterPage'
import { AppLayout } from './AppLayout'
import { HomeRoute } from './HomeRoute'
import { pageRoutes } from './pageRoutes'

export const router = createBrowserRouter([
  // Outside AppLayout: the landing page has its own header, and it isn't behind RequireAuth.
  { path: '/', element: <HomeRoute /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    // AppLayout wraps RequireAuth (not the reverse) so a public route — like the
    // marketplace browse page, which the backend serves without auth — can render
    // with the same nav/header chrome as the rest of the app for anonymous visitors.
    element: <AppLayout />,
    children: pageRoutes,
  },
])
