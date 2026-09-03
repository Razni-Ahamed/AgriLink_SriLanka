import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateCropRequest } from '@/types/dto/crops'

interface CropFormProps {
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CreateCropRequest) => void
}

export function CropForm({ submitLabel, isSubmitting, onSubmit }: CropFormProps) {
  const { t } = useTranslation(['farms', 'common'])

  const schema = useMemo(
    () =>
      z.object({
        cropType: z.string().min(1, t('common:validation.cropTypeRequired')).max(100),
        variety: z.string().max(100).optional().default(''),
        plantingDate: z.string().min(1, t('common:validation.plantingDateRequired')),
        expectedHarvestDate: z
          .string()
          .min(1, t('common:validation.expectedHarvestDateRequired')),
        expectedQuantity: z.coerce
          .number()
          .min(0.01, t('common:validation.quantityMin'))
          .max(1000000),
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
        label={t('farms:form.cropType')}
        error={errors.cropType?.message}
        {...register('cropType')}
      />
      <Input
        label={t('farms:form.variety')}
        error={errors.variety?.message}
        {...register('variety')}
      />
      <Input
        label={t('farms:form.plantingDate')}
        type="date"
        error={errors.plantingDate?.message}
        {...register('plantingDate')}
      />
      <Input
        label={t('farms:form.expectedHarvestDate')}
        type="date"
        error={errors.expectedHarvestDate?.message}
        {...register('expectedHarvestDate')}
      />
      <Input
        label={t('farms:form.expectedQuantity')}
        type="number"
        step="0.01"
        error={errors.expectedQuantity?.message}
        {...register('expectedQuantity')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common:actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
