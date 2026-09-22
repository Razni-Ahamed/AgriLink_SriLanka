import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DistrictSelect } from '@/components/ui/DistrictSelect'
import { Card } from '@/components/ui/Card'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { buildPasswordSchema } from '@/lib/passwordSchema'
import { register as registerRequest } from './api'
import type { RegisterRequest } from './api'

type Role = 'Farmer' | 'Buyer'

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'common'])
  const [role, setRole] = useState<Role>('Farmer')

  const baseFields = useMemo(
    () => ({
      fullName: z.string().min(1, t('common:validation.fullNameRequired')),
      email: z.string().email(t('common:validation.emailInvalid')),
      // Matches Identity's server-side policy (Program.cs) — the same schema backs the
      // change-password and admin-reset forms.
      password: buildPasswordSchema({
        min: t('common:validation.passwordMin12'),
        uppercase: t('common:validation.passwordUppercase'),
        lowercase: t('common:validation.passwordLowercase'),
        digit: t('common:validation.passwordDigit'),
        symbol: t('common:validation.passwordSymbol'),
      }),
      nic: z.string().min(1, t('common:validation.nicRequired')),
      district: z.string().min(1, t('common:validation.districtRequired')),
    }),
    [t],
  )

  const schema = useMemo(
    () =>
      z.discriminatedUnion('role', [
        z.object({
          role: z.literal('Farmer'),
          ...baseFields,
          fieldPlotNumber: z.string().min(1, t('common:validation.fieldPlotNumberRequired')),
          phoneNumber: z.string().min(1, t('common:validation.phoneNumberRequired')),
        }),
        z.object({
          role: z.literal('Buyer'),
          ...baseFields,
          businessRegistrationNumber: z
            .string()
            .min(1, t('common:validation.businessRegistrationNumberRequired')),
          businessPhone: z.string().min(1, t('common:validation.businessPhoneRequired')),
          legalBusinessName: z.string().min(1, t('common:validation.legalBusinessNameRequired')),
        }),
      ]),
    [baseFields, t],
  )

  type FormValues = z.infer<typeof schema>

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'Farmer' } as Partial<FormValues>,
  })

  // The role-specific fields only exist on one branch of the discriminated union, so
  // FieldErrors<FormValues> only ever types the branch common to both — look these up
  // dynamically rather than fighting the narrowing.
  const roleFieldError = (name: string) =>
    (errors as Record<string, { message?: string } | undefined>)[name]?.message

  const mutation = useMutation({
    mutationFn: (values: RegisterRequest) => registerRequest(values),
  })

  const selectRole = (next: Role) => {
    setRole(next)
    setValue('role', next)
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-10">
        <Card className="w-full max-w-sm text-center">
          <h1 className="mb-2 font-display text-2xl text-brand-forest">
            {t('auth:register.pendingTitle')}
          </h1>
          <p className="mb-6 text-sm text-text-secondary">{t('auth:register.pendingMessage')}</p>
          <a href="/login">
            <Button className="w-full">{t('auth:register.backToLogin')}</Button>
          </a>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-10">
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
      >
        <Card className="w-full max-w-sm">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="mb-1 font-display text-2xl text-brand-forest">
            {t('auth:register.title')}
          </h1>
          <p className="mb-6 text-sm text-text-secondary">{t('auth:register.subtitle')}</p>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={role === 'Farmer' ? 'primary' : 'secondary'}
              onClick={() => selectRole('Farmer')}
            >
              {t('auth:register.roleFarmer')}
            </Button>
            <Button
              type="button"
              variant={role === 'Buyer' ? 'primary' : 'secondary'}
              onClick={() => selectRole('Buyer')}
            >
              {t('auth:register.roleBuyer')}
            </Button>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values as RegisterRequest))}
          >
            <Input
              label={t('common:fields.fullName')}
              error={errors.fullName?.message}
              {...registerField('fullName')}
            />
            <Input
              label={t('common:fields.email')}
              type="email"
              error={errors.email?.message}
              {...registerField('email')}
            />
            <Input
              label={t('common:fields.password')}
              type="password"
              error={errors.password?.message}
              {...registerField('password')}
            />
            <Input
              label={t('common:fields.nic')}
              error={errors.nic?.message}
              {...registerField('nic')}
            />
            <DistrictSelect error={errors.district?.message} {...registerField('district')} />

            {role === 'Farmer' ? (
              <>
                <Input
                  label={t('common:fields.fieldPlotNumber')}
                  error={roleFieldError('fieldPlotNumber')}
                  {...registerField('fieldPlotNumber')}
                />
                <Input
                  label={t('common:fields.phoneNumber')}
                  error={roleFieldError('phoneNumber')}
                  {...registerField('phoneNumber')}
                />
              </>
            ) : (
              <>
                <Input
                  label={t('common:fields.legalBusinessName')}
                  error={roleFieldError('legalBusinessName')}
                  {...registerField('legalBusinessName')}
                />
                <Input
                  label={t('common:fields.businessRegistrationNumber')}
                  error={roleFieldError('businessRegistrationNumber')}
                  {...registerField('businessRegistrationNumber')}
                />
                <Input
                  label={t('common:fields.businessPhone')}
                  error={roleFieldError('businessPhone')}
                  {...registerField('businessPhone')}
                />
              </>
            )}

            {mutation.isError && (
              <p className="text-sm text-state-danger">{t('auth:register.error')}</p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('auth:register.submitting') : t('auth:register.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            {t('auth:register.haveAccount')}{' '}
            <a href="/login" className="text-brand-forest hover:underline">
              {t('auth:register.loginLink')}
            </a>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
