import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateCropRequest } from '@/types/dto/crops'

const schema = z.object({
  cropType: z.string().min(1, 'Crop type is required').max(100),
  variety: z.string().max(100).optional().default(''),
  plantingDate: z.string().min(1, 'Planting date is required'),
  expectedHarvestDate: z.string().min(1, 'Expected harvest date is required'),
  expectedQuantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0').max(1000000),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface CropFormProps {
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CreateCropRequest) => void
}

export function CropForm({ submitLabel, isSubmitting, onSubmit }: CropFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Crop type" error={errors.cropType?.message} {...register('cropType')} />
      <Input label="Variety" error={errors.variety?.message} {...register('variety')} />
      <Input
        label="Planting date"
        type="date"
        error={errors.plantingDate?.message}
        {...register('plantingDate')}
      />
      <Input
        label="Expected harvest date"
        type="date"
        error={errors.expectedHarvestDate?.message}
        {...register('expectedHarvestDate')}
      />
      <Input
        label="Expected quantity (kg)"
        type="number"
        step="0.01"
        error={errors.expectedQuantity?.message}
        {...register('expectedQuantity')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
