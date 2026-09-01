import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

interface PurchaseRequestFormProps {
  availableQuantity: number
  isSubmitting?: boolean
  onSubmit: (values: { requestedQuantity: number; message?: string }) => void
}

export function PurchaseRequestForm({
  availableQuantity,
  isSubmitting,
  onSubmit,
}: PurchaseRequestFormProps) {
  const schema = z.object({
    requestedQuantity: z.coerce
      .number()
      .min(0.01, 'Quantity must be greater than 0')
      .max(availableQuantity, `Only ${availableQuantity} available`),
    message: z.string().max(500).optional(),
  })

  type FormInput = z.input<typeof schema>
  type FormOutput = z.output<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(schema) })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label={`Quantity (up to ${availableQuantity})`}
        type="number"
        step="0.01"
        error={errors.requestedQuantity?.message}
        {...register('requestedQuantity')}
      />
      <Textarea
        label="Message (optional)"
        rows={3}
        error={errors.message?.message}
        {...register('message')}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send Request'}
      </Button>
    </form>
  )
}
