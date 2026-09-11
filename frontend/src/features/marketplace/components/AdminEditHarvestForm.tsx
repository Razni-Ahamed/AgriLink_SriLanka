import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { HarvestListingResponse, HarvestStatus, UpdateHarvestListingRequest } from '@/types/dto/harvests'

const statusOptions: HarvestStatus[] = ['Active', 'Sold', 'Cancelled']

interface AdminEditHarvestFormProps {
  harvest: HarvestListingResponse
  isSubmitting?: boolean
  onSubmit: (values: UpdateHarvestListingRequest) => void
}

/** Admin-only moderation form — PUT /api/harvests/{id} lets Admin edit any farmer's listing. */
export function AdminEditHarvestForm({ harvest, isSubmitting, onSubmit }: AdminEditHarvestFormProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const statusLabel = useStatusLabel()

  const schema = useMemo(
    () =>
      z.object({
        status: z.enum(['Active', 'Sold', 'Cancelled']),
        pricePerUnit: z.coerce.number().min(0.01, t('common:validation.priceMin')).max(1000000),
        location: z.string().min(1, t('common:validation.locationRequired')).max(150),
        harvestDate: z.string().min(1, t('common:validation.harvestDateRequired')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: harvest.status,
      pricePerUnit: harvest.pricePerUnit,
      location: harvest.location,
      harvestDate: harvest.harvestDate,
    },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Select label={t('common:fields.status')} error={errors.status?.message} {...register('status')}>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {statusLabel('harvest', status)}
          </option>
        ))}
      </Select>
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
      <Input
        label={t('marketplace:listingForm.harvestDate')}
        type="date"
        error={errors.harvestDate?.message}
        {...register('harvestDate')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('marketplace:adminEdit.saving') : t('marketplace:adminEdit.save')}
      </Button>
    </form>
  )
}
