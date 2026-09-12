import type { RouteObject } from 'react-router-dom'
import { Bell, Building, Gear, ClipboardText, UserCircle } from '@/components/ui/icons'
import { OrderTruckIcon } from '@/components/ui/icons/custom'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { MyOrdersPage } from './pages/MyOrdersPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OrderDetailPage } from './pages/OrderDetailPage'

export const ordersRoutes: RouteObject[] = [
  {
    // GET /api/orders/mine is Farmer,Buyer-only on the backend — gate the route itself, not
    // just the nav link, so an Officer/Admin who types the URL lands on /unauthorized instead
    // of a bare 403 from the API.
    element: <RequireRole allow={['Farmer', 'Buyer']} />,
    children: [{ path: '/orders/mine', element: <MyOrdersPage /> }],
  },
  { path: '/orders/:orderId', element: <OrderDetailPage /> },
  { path: '/notifications', element: <NotificationsPage /> },
  {
    element: <RequireRole allow={['Admin']} />,
    children: [
      { path: '/admin', element: <AdminDashboardPage /> },
      { path: '/admin/users', element: <AdminUsersPage /> },
      { path: '/admin/departments', element: <DepartmentsPage /> },
      { path: '/admin/audit-log', element: <AuditLogPage /> },
    ],
  },
]

export const ordersNavItems: NavItem[] = [
  {
    labelKey: 'nav.orders',
    path: '/orders/mine',
    icon: <OrderTruckIcon size={18} />,
    allowedRoles: ['Farmer', 'Buyer'],
  },
  {
    labelKey: 'nav.notifications',
    path: '/notifications',
    icon: <Bell size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Officer', 'Buyer', 'Admin'],
  },
  {
    labelKey: 'nav.adminDashboard',
    path: '/admin',
    icon: <Gear size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
  {
    labelKey: 'nav.manageUsers',
    path: '/admin/users',
    icon: <UserCircle size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
  {
    labelKey: 'nav.departments',
    path: '/admin/departments',
    icon: <Building size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
  {
    labelKey: 'nav.auditLog',
    path: '/admin/audit-log',
    icon: <ClipboardText size={18} weight="duotone" />,
    allowedRoles: ['Admin'],
  },
]
