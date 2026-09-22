import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { buildPasswordSchema } from '@/lib/passwordSchema'

export interface ChangePasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

interface ChangePasswordFormProps {
  isSubmitting?: boolean
  onSubmit: (values: ChangePasswordFormValues) => void
}

export function ChangePasswordForm({ isSubmitting, onSubmit }: ChangePasswordFormProps) {
  const { t } = useTranslation(['auth', 'common'])

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('common:validation.passwordRequired')),
          newPassword: buildPasswordSchema({
            min: t('common:validation.passwordMin12'),
            uppercase: t('common:validation.passwordUppercase'),
            lowercase: t('common:validation.passwordLowercase'),
            digit: t('common:validation.passwordDigit'),
            symbol: t('common:validation.passwordSymbol'),
          }),
          confirmNewPassword: z.string().min(1, t('common:validation.passwordRequired')),
        })
        .refine((values) => values.newPassword === values.confirmNewPassword, {
          message: t('common:validation.passwordsMustMatch'),
          path: ['confirmNewPassword'],
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(schema) })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input
        label={t('auth:changePassword.currentPassword')}
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <Input
        label={t('auth:changePassword.newPassword')}
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        label={t('auth:changePassword.confirmNewPassword')}
        type="password"
        autoComplete="new-password"
        error={errors.confirmNewPassword?.message}
        {...register('confirmNewPassword')}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('auth:changePassword.submitting') : t('auth:changePassword.submit')}
      </Button>
    </form>
  )
}
