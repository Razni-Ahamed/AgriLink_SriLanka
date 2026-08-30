import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateFarmRequest, FarmDto } from '@/types/dto/farms'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  district: z.string().min(1, 'District is required').max(50),
  area: z.coerce.number().min(0.01, 'Area must be greater than 0').max(100000),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface FarmFormProps {
  defaultValues?: Pick<FarmDto, 'name' | 'district' | 'area'>
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CreateFarmRequest) => void
}

export function FarmForm({ defaultValues, submitLabel, isSubmitting, onSubmit }: FarmFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Farm name" error={errors.name?.message} {...register('name')} />
      <Input label="District" error={errors.district?.message} {...register('district')} />
      <Input
        label="Area (acres)"
        type="number"
        step="0.01"
        error={errors.area?.message}
        {...register('area')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
