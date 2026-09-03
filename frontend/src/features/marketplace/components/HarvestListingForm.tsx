import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateHarvestListingRequest } from '@/types/dto/harvests'

interface HarvestListingFormProps {
  prefill?: { cropId?: number; cropType?: string }
  isSubmitting?: boolean
  onSubmit: (values: CreateHarvestListingRequest) => void
}

export function HarvestListingForm({ prefill, isSubmitting, onSubmit }: HarvestListingFormProps) {
  const { t } = useTranslation(['marketplace', 'common'])

  const schema = useMemo(
    () =>
      z.object({
        cropId: z.coerce.number().int().min(1, t('common:validation.cropIdRequired')),
        quantity: z.coerce.number().min(0.01, t('common:validation.quantityMin')).max(1000000),
        harvestDate: z.string().min(1, t('common:validation.harvestDateRequired')),
        pricePerUnit: z.coerce.number().min(0.01, t('common:validation.priceMin')).max(1000000),
        location: z.string().min(1, t('common:validation.locationRequired')).max(150),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: prefill?.cropId ? { cropId: prefill.cropId } : undefined,
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      {prefill?.cropType && (
        <p className="text-sm text-text-secondary">
          {t('marketplace:listingForm.prefill', {
            cropType: prefill.cropType,
            cropId: prefill.cropId,
          })}
        </p>
      )}
      <Input
        label={t('marketplace:listingForm.cropId')}
        type="number"
        error={errors.cropId?.message}
        {...register('cropId')}
      />
      <Input
        label={t('marketplace:listingForm.quantity')}
        type="number"
        step="0.01"
        error={errors.quantity?.message}
        {...register('quantity')}
      />
      <Input
        label={t('marketplace:listingForm.harvestDate')}
        type="date"
        error={errors.harvestDate?.message}
        {...register('harvestDate')}
      />
      <Input
        label={t('marketplace:listingForm.pricePerUnit')}
        type="number"
        step="0.01"
        error={errors.pricePerUnit?.message}
        {...register('pricePerUnit')}
      />
      <Input
        label={t('marketplace:listingForm.location')}
        error={errors.location?.message}
        {...register('location')}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting
          ? t('marketplace:listingForm.publishing')
          : t('marketplace:listingForm.publish')}
      </Button>
    </form>
  )
}
