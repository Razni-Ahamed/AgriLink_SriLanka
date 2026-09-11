import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'
import type { UpdateUserRoleRequest, UpdateUserStatusRequest } from '@/types/dto/admin'

const usersKey = ['admin', 'users'] as const
const rolesKey = ['admin', 'roles'] as const

export function useAdminUsers() {
  return useQuery({ queryKey: usersKey, queryFn: adminApi.getUsers })
}

export function useAdminRoles() {
  return useQuery({ queryKey: rolesKey, queryFn: adminApi.getRoles })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, request }: { userId: number; request: UpdateUserRoleRequest }) =>
      adminApi.updateUserRole(userId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, request }: { userId: number; request: UpdateUserStatusRequest }) =>
      adminApi.updateUserStatus(userId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}
