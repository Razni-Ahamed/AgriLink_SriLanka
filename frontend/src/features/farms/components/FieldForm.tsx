import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateFieldRequest } from '@/types/dto/farms'

interface FieldFormProps {
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CreateFieldRequest) => void
}

export function FieldForm({ submitLabel, isSubmitting, onSubmit }: FieldFormProps) {
  const { t } = useTranslation(['farms', 'common'])

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('common:validation.nameRequired')).max(100),
        area: z.coerce.number().min(0.01, t('common:validation.areaMin')).max(100000),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label={t('farms:form.fieldName')}
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label={t('farms:form.area')}
        type="number"
        step="0.01"
        error={errors.area?.message}
        {...register('area')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common:actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
