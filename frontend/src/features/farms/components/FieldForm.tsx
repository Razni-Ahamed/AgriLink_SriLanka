import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CreateFieldRequest } from '@/types/dto/farms'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  area: z.coerce.number().min(0.01, 'Area must be greater than 0').max(100000),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface FieldFormProps {
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CreateFieldRequest) => void
}

export function FieldForm({ submitLabel, isSubmitting, onSubmit }: FieldFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Field name" error={errors.name?.message} {...register('name')} />
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
