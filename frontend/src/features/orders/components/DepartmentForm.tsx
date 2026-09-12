import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DepartmentRequest } from '@/types/dto/admin'

interface DepartmentFormProps {
  initialName?: string
  isSubmitting?: boolean
  submitLabel: string
  onSubmit: (values: DepartmentRequest) => void
}

export function DepartmentForm({ initialName, isSubmitting, submitLabel, onSubmit }: DepartmentFormProps) {
  const { t } = useTranslation(['orders', 'common'])

  const schema = useMemo(
    () => z.object({ name: z.string().min(1, t('orders:departments.nameRequired')).max(100) }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName ?? '' },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label={t('orders:departments.name')}
        error={errors.name?.message}
        {...register('name')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('orders:admin.updating') : submitLabel}
      </Button>
    </form>
  )
}
