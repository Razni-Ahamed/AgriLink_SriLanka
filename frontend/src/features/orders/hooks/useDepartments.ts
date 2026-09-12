import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'
import type { DepartmentRequest } from '@/types/dto/admin'

const departmentsKey = ['admin', 'departments'] as const

export function useDepartments() {
  return useQuery({ queryKey: departmentsKey, queryFn: adminApi.getDepartments })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DepartmentRequest) => adminApi.createDepartment(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentsKey }),
  })
}

export function useRenameDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ departmentId, request }: { departmentId: number; request: DepartmentRequest }) =>
      adminApi.renameDepartment(departmentId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentsKey }),
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (departmentId: number) => adminApi.deleteDepartment(departmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentsKey }),
  })
}
