import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['marketplace', 'common'])

  const schema = useMemo(
    () =>
      z.object({
        requestedQuantity: z.coerce
          .number()
          .min(0.01, t('common:validation.quantityMin'))
          .max(availableQuantity, t('common:validation.onlyAvailable', { max: availableQuantity })),
        message: z.string().max(500).optional(),
      }),
    [t, availableQuantity],
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
        label={t('marketplace:requestForm.quantityLabel', { max: availableQuantity })}
        type="number"
        step="0.01"
        error={errors.requestedQuantity?.message}
        {...register('requestedQuantity')}
      />
      <Textarea
        label={t('common:fields.messageOptional')}
        rows={3}
        error={errors.message?.message}
        {...register('message')}
      />
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? t('marketplace:requestForm.sending') : t('marketplace:requestForm.send')}
      </Button>
    </form>
  )
}
