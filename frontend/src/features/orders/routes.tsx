import type { RouteObject } from 'react-router-dom'
import { Bell, Gear, UserCircle } from '@/components/ui/icons'
import { OrderTruckIcon } from '@/components/ui/icons/custom'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { MyOrdersPage } from './pages/MyOrdersPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OrderDetailPage } from './pages/OrderDetailPage'

export const ordersRoutes: RouteObject[] = [
  { path: '/orders/mine', element: <MyOrdersPage /> },
  { path: '/orders/:orderId', element: <OrderDetailPage /> },
  { path: '/notifications', element: <NotificationsPage /> },
  {
    element: <RequireRole allow={['Admin']} />,
    children: [
      { path: '/admin', element: <AdminDashboardPage /> },
      { path: '/admin/users', element: <AdminUsersPage /> },
    ],
  },
]

export const ordersNavItems: NavItem[] = [
  {
    label: 'Orders',
    path: '/orders/mine',
    icon: <OrderTruckIcon size={18} />,
    allowedRoles: ['Farmer', 'Buyer'],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: <Bell size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Officer', 'Buyer', 'Admin'],
  },
  {
    label: 'Admin Dashboard',
    path: '/admin',
    icon: <Gear size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
  {
    label: 'Manage Users',
    path: '/admin/users',
    icon: <UserCircle size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
]
