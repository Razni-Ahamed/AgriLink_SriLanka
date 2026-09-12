import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CurrencyCircleDollar, Package, Receipt, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { CropPicker } from '@/components/ui/CropPicker'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCropLabel } from '@/lib/useCropLabel'
import { formatQuantity } from '@/lib/utils'
import { useMyCrops } from '@/features/farms/hooks/useCrops'
import type { CreateHarvestListingRequest } from '@/types/dto/harvests'

interface HarvestListingFormProps {
  prefill?: { cropId?: number; cropType?: string }
  isSubmitting?: boolean
  onSubmit: (values: CreateHarvestListingRequest) => void
}

export function HarvestListingForm({ prefill, isSubmitting, onSubmit }: HarvestListingFormProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const cropLabel = useCropLabel()
  const { data: crops, isLoading: isLoadingCrops } = useMyCrops()

  const schema = useMemo(
    () =>
      z.object({
        cropId: z.coerce.number().int().min(1, t('common:validation.cropRequired')),
        quantity: z.coerce.number().min(0.01, t('common:validation.quantityMin')).max(1000000),
        harvestDate: z.string().min(1, t('common:validation.harvestDateRequired')),
        pricePerUnit: z.coerce.number().min(0.01, t('common:validation.priceMin')).max(1000000),
        location: z.string().min(1, t('common:validation.locationRequired')).max(150),
      }),
    [t],
  )

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { cropId: prefill?.cropId },
  })

  const selectedCropId = watch('cropId')
  const selectedCrop = crops?.find((crop) => crop.cropId === Number(selectedCropId))

  // The listing's location defaults to the crop's own farm district — the farmer can still
  // override it, but the common case is that the harvest is where the farm is.
  useEffect(() => {
    if (selectedCrop) setValue('location', selectedCrop.district, { shouldValidate: false })
  }, [selectedCrop, setValue])

  if (isLoadingCrops) {
    return <Skeleton className="h-64" />
  }

  // Nothing to list yet: say so and point at the flow that fixes it, rather than showing a
  // crop picker with no crops in it.
  if (!crops || crops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <IconBadge tone="terracotta">
          <Warning size={20} weight="duotone" />
        </IconBadge>
        <p className="text-sm text-text-primary">{t('marketplace:listingForm.noCrops')}</p>
        <Link to="/farms" className="text-sm font-medium text-brand-forest hover:underline">
          {t('marketplace:listingForm.goToFarms')}
        </Link>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="cropId"
        render={({ field }) => (
          <CropPicker
            crops={crops}
            value={
              field.value === undefined || field.value === '' ? undefined : Number(field.value)
            }
            onChange={field.onChange}
            label={t('marketplace:listingForm.crop')}
            error={errors.cropId?.message}
          />
        )}
      />

      {selectedCrop && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-forest/10 bg-brand-forest/5 p-3">
          <IconBadge tone="forest">
            <CropIcon cropType={selectedCrop.cropType} size={20} />
          </IconBadge>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-text-primary">
              {cropLabel(selectedCrop.cropType)}
              {selectedCrop.variety && (
                <span className="text-text-secondary"> · {selectedCrop.variety}</span>
              )}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {t('common:fields.cropLocation', {
                field: selectedCrop.fieldName,
                farm: selectedCrop.farmName,
              })}
            </p>
            <p className="font-mono text-xs text-brand-forest">
              {t('marketplace:listingForm.expectedYield', {
                value: formatQuantity(selectedCrop.expectedQuantity),
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('marketplace:listingForm.quantity')}
          type="number"
          step="0.01"
          error={errors.quantity?.message}
          {...register('quantity')}
        />
        <Input
          label={t('marketplace:listingForm.pricePerUnit')}
          type="number"
          step="0.01"
          error={errors.pricePerUnit?.message}
          {...register('pricePerUnit')}
        />
      </div>

      <Input
        label={t('marketplace:listingForm.harvestDate')}
        type="date"
        error={errors.harvestDate?.message}
        {...register('harvestDate')}
      />
      <Input
        label={t('marketplace:listingForm.location')}
        error={errors.location?.message}
        {...register('location')}
      />

      {/* A quick read of what the buyer will see, so the numbers are checked before publishing. */}
      <SummaryRow quantity={watch('quantity')} pricePerUnit={watch('pricePerUnit')} />

      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting
          ? t('marketplace:listingForm.publishing')
          : t('marketplace:listingForm.publish')}
      </Button>
    </form>
  )
}

function SummaryRow({ quantity, pricePerUnit }: { quantity: unknown; pricePerUnit: unknown }) {
  const { t } = useTranslation(['marketplace', 'common'])
  const qty = Number(quantity)
  const price = Number(pricePerUnit)

  if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price <= 0) {
    return null
  }

  return (
    <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-brand-forest/10 bg-bg-canvas p-3 text-center">
      <div>
        <dt className="flex items-center justify-center gap-1 text-xs text-text-secondary">
          <Package size={13} />
          {t('marketplace:listingForm.quantity')}
        </dt>
        <dd className="font-mono tabular-nums text-sm text-text-primary">{formatQuantity(qty)}</dd>
      </div>
      <div>
        <dt className="flex items-center justify-center gap-1 text-xs text-text-secondary">
          <CurrencyCircleDollar size={13} />
          {t('marketplace:listingForm.pricePerUnit')}
        </dt>
        <dd className="font-mono tabular-nums text-sm text-text-primary">
          {formatQuantity(price)}
        </dd>
      </div>
      <div>
        <dt className="flex items-center justify-center gap-1 text-xs text-text-secondary">
          <Receipt size={13} />
          {t('marketplace:listingForm.estimatedTotal')}
        </dt>
        <dd className="font-mono tabular-nums text-sm font-medium text-brand-forest">
          {t('common:units.rupees', { value: formatQuantity(qty * price) })}
        </dd>
      </div>
    </dl>
  )
}
