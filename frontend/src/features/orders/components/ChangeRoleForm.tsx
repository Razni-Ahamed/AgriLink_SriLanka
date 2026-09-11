import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useDistricts } from '@/lib/useDistricts'
import { useDepartments } from '../hooks/useDepartments'
import type { AdminUserSummary, UpdateUserRoleRequest } from '@/types/dto/admin'

interface ChangeRoleFormProps {
  user: AdminUserSummary
  isSubmitting?: boolean
  onSubmit: (values: UpdateUserRoleRequest) => void
}

/** Only Officer and Buyer are reachable here — AdminController rejects Farmer/Admin targets. */
export function ChangeRoleForm({ user, isSubmitting, onSubmit }: ChangeRoleFormProps) {
  const { t } = useTranslation(['orders', 'common'])
  const { data: districts, isLoading: isLoadingDistricts } = useDistricts()
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments()
  const otherRole = user.role === 'Officer' ? 'Buyer' : 'Officer'

  const schema = useMemo(
    () =>
      z
        .object({
          role: z.enum(['Officer', 'Buyer']),
          district: z.string().min(1, t('common:validation.districtRequired')).max(50),
          departmentId: z.coerce.number().optional(),
          businessName: z.string().max(100).optional(),
        })
        .refine((values) => values.role !== 'Officer' || !!values.departmentId, {
          message: t('common:validation.departmentRequiredOfficer'),
          path: ['departmentId'],
        })
        .refine((values) => values.role !== 'Buyer' || !!values.businessName, {
          message: t('common:validation.businessNameRequiredBuyer'),
          path: ['businessName'],
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: otherRole, district: user.district ?? '' },
  })

  const role = watch('role')

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <p className="text-sm text-text-secondary">
        {t('orders:admin.changeRoleFor', { name: user.fullName })}
      </p>
      <Select label={t('common:fields.role')} error={errors.role?.message} {...register('role')}>
        <option value="Officer" disabled={user.role === 'Officer'}>
          {t('common:roles.Officer')}
        </option>
        <option value="Buyer" disabled={user.role === 'Buyer'}>
          {t('common:roles.Buyer')}
        </option>
      </Select>
      <Select
        label={t('common:fields.district')}
        error={errors.district?.message}
        disabled={isLoadingDistricts}
        {...register('district')}
      >
        <option value="" disabled>
          {isLoadingDistricts ? t('common:actions.loading') : t('common:fields.selectDistrict')}
        </option>
        {districts?.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </Select>
      {role === 'Officer' && (
        <Select
          label={t('common:fields.department')}
          error={errors.departmentId?.message}
          disabled={isLoadingDepartments}
          defaultValue=""
          {...register('departmentId')}
        >
          <option value="" disabled>
            {isLoadingDepartments
              ? t('common:actions.loading')
              : t('orders:departments.selectDepartment')}
          </option>
          {departments?.map((department) => (
            <option key={department.departmentId} value={department.departmentId}>
              {department.name}
            </option>
          ))}
        </Select>
      )}
      {role === 'Buyer' && (
        <Input
          label={t('common:fields.businessName')}
          error={errors.businessName?.message}
          {...register('businessName')}
        />
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('orders:admin.updating') : t('orders:admin.updateRole')}
      </Button>
    </form>
  )
}
