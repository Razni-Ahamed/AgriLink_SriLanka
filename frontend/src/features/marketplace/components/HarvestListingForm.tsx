import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateHarvestListingRequest } from '@/types/dto/harvests'

const schema = z.object({
  cropId: z.coerce.number().int().min(1, 'Crop ID is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0').max(1000000),
  harvestDate: z.string().min(1, 'Harvest date is required'),
  pricePerUnit: z.coerce.number().min(0.01, 'Price must be greater than 0').max(1000000),
  location: z.string().min(1, 'Location is required').max(150),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface HarvestListingFormProps {
  prefill?: { cropId?: number; cropType?: string }
  isSubmitting?: boolean
  onSubmit: (values: CreateHarvestListingRequest) => void
}

export function HarvestListingForm({ prefill, isSubmitting, onSubmit }: HarvestListingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: prefill?.cropId ? { cropId: prefill.cropId } : undefined,
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      {prefill?.cropType && (
        <p className="text-sm text-text-secondary">
          Listing <span className="font-medium text-text-primary">{prefill.cropType}</span>{' '}
          (crop #{prefill.cropId})
        </p>
      )}
      <Input
        label="Crop ID"
        type="number"
        error={errors.cropId?.message}
        {...register('cropId')}
      />
      <Input
        label="Quantity"
        type="number"
        step="0.01"
        error={errors.quantity?.message}
        {...register('quantity')}
      />
      <Input
        label="Harvest date"
        type="date"
        error={errors.harvestDate?.message}
        {...register('harvestDate')}
      />
      <Input
        label="Price per unit (Rs)"
        type="number"
        step="0.01"
        error={errors.pricePerUnit?.message}
        {...register('pricePerUnit')}
      />
      <Input label="Location" error={errors.location?.message} {...register('location')} />
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? 'Publishing…' : 'Publish Listing'}
      </Button>
    </form>
  )
}
