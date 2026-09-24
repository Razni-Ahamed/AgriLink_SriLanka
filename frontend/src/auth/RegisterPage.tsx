import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PasswordChecklist } from '@/components/ui/PasswordChecklist'
import { UsernameAvailabilityHint } from '@/components/ui/UsernameAvailabilityHint'
import { DistrictSelect } from '@/components/ui/DistrictSelect'
import { Card } from '@/components/ui/Card'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { buildPasswordSchema } from '@/lib/passwordSchema'
import { buildUsernameSchema } from '@/lib/usernameSchema'
import { useUsernameAvailability } from '@/lib/useUsernameAvailability'
import { NIC_NEW_FORMAT_REGEX, NIC_OLD_FORMAT_REGEX, PHONE_REGEX, normalizeNic, normalizePhone } from '@/lib/validation'
import { parseApiError } from '@/lib/apiErrors'
import { register as registerRequest } from './api'
import type { RegisterRequest } from './api'

type Role = 'Farmer' | 'Buyer'

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'common'])
  const [searchParams] = useSearchParams()
  // The home page's role cards link here with ?role= so the form opens on the role they picked.
  const initialRole: Role = searchParams.get('role') === 'Buyer' ? 'Buyer' : 'Farmer'
  const [role, setRole] = useState<Role>(initialRole)
  const [generalErrors, setGeneralErrors] = useState<string[]>([])
  const passwordChecklistId = useId()
  const usernameHintId = useId()

  const baseFields = useMemo(
    () => ({
      fullName: z
        .string()
        .trim()
        .min(2, t('common:validation.fullNameRequired'))
        .max(100, t('common:validation.nameTooLong')),
      email: z
        .string()
        .trim()
        .min(1, t('common:validation.emailInvalid'))
        .email(t('common:validation.emailInvalid'))
        .max(256, t('common:validation.emailTooLong')),
      username: buildUsernameSchema({
        tooShort: t('common:validation.usernameTooShort'),
        tooLong: t('common:validation.usernameTooLong'),
        invalid: t('common:validation.usernameInvalid'),
        reserved: t('common:validation.usernameReserved'),
      }),
      // Matches Identity's server-side policy (Program.cs) — the same schema backs the
      // change-password and admin-reset forms.
      password: buildPasswordSchema({
        min: t('common:validation.passwordMin12'),
        uppercase: t('common:validation.passwordUppercase'),
        lowercase: t('common:validation.passwordLowercase'),
        digit: t('common:validation.passwordDigit'),
        symbol: t('common:validation.passwordSymbol'),
      }),
      confirmPassword: z.string().min(1, t('common:validation.confirmPasswordRequired')),
      nic: z
        .string()
        .min(1, t('common:validation.nicRequired'))
        .transform(normalizeNic)
        .refine(
          (value) => NIC_NEW_FORMAT_REGEX.test(value) || NIC_OLD_FORMAT_REGEX.test(value),
          t('common:validation.nicInvalid'),
        ),
      district: z.string().min(1, t('common:validation.districtRequired')),
    }),
    [t],
  )

  const schema = useMemo(
    () =>
      z
        .discriminatedUnion('role', [
          z.object({
            role: z.literal('Farmer'),
            ...baseFields,
            fieldPlotNumber: z
              .string()
              .trim()
              .min(1, t('common:validation.fieldPlotNumberRequired'))
              .max(50, t('common:validation.fieldPlotNumberTooLong')),
            phoneNumber: z
              .string()
              .min(1, t('common:validation.phoneNumberRequired'))
              .transform(normalizePhone)
              .refine((value) => PHONE_REGEX.test(value), t('common:validation.phoneNumberInvalid')),
          }),
          z.object({
            role: z.literal('Buyer'),
            ...baseFields,
            businessRegistrationNumber: z
              .string()
              .trim()
              .min(1, t('common:validation.businessRegistrationNumberRequired'))
              .max(50, t('common:validation.businessRegistrationNumberTooLong')),
            businessPhone: z
              .string()
              .min(1, t('common:validation.businessPhoneRequired'))
              .transform(normalizePhone)
              .refine((value) => PHONE_REGEX.test(value), t('common:validation.businessPhoneInvalid')),
            legalBusinessName: z
              .string()
              .trim()
              .min(1, t('common:validation.legalBusinessNameRequired'))
              .max(100, t('common:validation.legalBusinessNameTooLong')),
          }),
        ])
        .superRefine((values, ctx) => {
          if (values.password !== values.confirmPassword) {
            ctx.addIssue({
              code: 'custom',
              message: t('common:validation.confirmPasswordMismatch'),
              path: ['confirmPassword'],
            })
          }
        }),
    [baseFields, t],
  )

  type FormInput = z.input<typeof schema>
  type FormOutput = z.output<typeof schema>

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    watch,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { role: initialRole } as Partial<FormInput>,
  })

  const passwordValue = watch('password') ?? ''
  const usernameStatus = useUsernameAvailability(watch('username') ?? '')

  // The role-specific fields only exist on one branch of the discriminated union, so
  // FieldErrors<FormValues> only ever types the branch common to both — look these up
  // dynamically rather than fighting the narrowing.
  const roleFieldError = (name: string) =>
    (errors as Record<string, { message?: string } | undefined>)[name]?.message

  const mutation = useMutation({
    mutationFn: (values: RegisterRequest) => registerRequest(values),
    onError: (error) => {
      const parsed = parseApiError(error, t)
      Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
        setError(field as keyof FormInput, { type: 'server', message })
      })
      setGeneralErrors(parsed.generalErrors)
    },
  })

  const selectRole = (next: Role) => {
    setRole(next)
    setValue('role', next)
  }

  const onSubmit = handleSubmit((values) => {
    setGeneralErrors([])
    // The live check already knows; the server would refuse it with a 409 anyway.
    if (usernameStatus === 'taken') {
      setError('username', { type: 'server', message: t('common:validation.usernameTaken') })
      return
    }
    if (values.role === 'Farmer') {
      mutation.mutate({
        role: 'Farmer',
        fullName: values.fullName,
        email: values.email,
        username: values.username,
        password: values.password,
        nic: values.nic,
        district: values.district,
        fieldPlotNumber: values.fieldPlotNumber,
        phoneNumber: values.phoneNumber,
      })
    } else {
      mutation.mutate({
        role: 'Buyer',
        fullName: values.fullName,
        email: values.email,
        username: values.username,
        password: values.password,
        nic: values.nic,
        district: values.district,
        businessRegistrationNumber: values.businessRegistrationNumber,
        businessPhone: values.businessPhone,
        legalBusinessName: values.legalBusinessName,
      })
    }
  })

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

          <Link to="/" className="mb-2 inline-block text-sm text-brand-forest hover:underline">
            {t('common:appName')}
          </Link>
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

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Input
              label={t('common:fields.fullName')}
              autoComplete="name"
              error={errors.fullName?.message}
              {...registerField('fullName')}
            />
            <Input
              label={t('common:fields.email')}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...registerField('email')}
            />
            <div>
              <Input
                label={t('common:fields.username')}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                aria-describedby={usernameHintId}
                error={errors.username?.message}
                {...registerField('username')}
              />
              <UsernameAvailabilityHint id={usernameHintId} status={usernameStatus} />
            </div>
            <div>
              <PasswordInput
                label={t('common:fields.password')}
                autoComplete="new-password"
                aria-describedby={passwordChecklistId}
                error={errors.password?.message}
                {...registerField('password')}
              />
              <div className="mt-2">
                <PasswordChecklist id={passwordChecklistId} password={passwordValue} />
              </div>
            </div>
            <PasswordInput
              label={t('common:fields.confirmPassword')}
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...registerField('confirmPassword')}
            />
            <Input
              label={t('common:fields.nic')}
              autoCapitalize="characters"
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
                  inputMode="numeric"
                  autoComplete="tel"
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
                  inputMode="numeric"
                  autoComplete="tel"
                  error={roleFieldError('businessPhone')}
                  {...registerField('businessPhone')}
                />
              </>
            )}

            {generalErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-state-danger/30 bg-state-danger/10 p-3 text-sm text-state-danger"
              >
                {generalErrors.map((message, index) => (
                  <p key={index}>{message}</p>
                ))}
              </div>
            )}
            <Button type="submit" isLoading={mutation.isPending}>
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
