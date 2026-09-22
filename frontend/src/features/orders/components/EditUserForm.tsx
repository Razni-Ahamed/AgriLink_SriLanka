import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { DistrictSelect } from '@/components/ui/DistrictSelect'
import { Input } from '@/components/ui/Input'
import { isValidNic, isValidPhone } from '@/lib/validation'
import type { AdminUserSummary, AdminUpdateUserProfileRequest } from '@/types/dto/admin'

interface EditUserFormProps {
  user: AdminUserSummary
  isSubmitting?: boolean
  onSubmit: (changes: AdminUpdateUserProfileRequest) => void
}

/**
 * Edits any user's identity/contact details directly (no approval step — the admin already is
 * the approver). Only full name, email and district are things this table already shows, so only
 * those are pre-filled as placeholders; every other field (display name, phone, NIC, business
 * details) is typed fresh and left blank to keep its current value, since the admin users list
 * has no way to show what that value currently is. This form never clears a field to empty —
 * clearing an Officer/Admin's own phone is only possible through their own Security tab.
 */
export function EditUserForm({ user, isSubmitting, onSubmit }: EditUserFormProps) {
  const { t } = useTranslation(['orders', 'common'])
  const showsNic = user.role === 'Farmer' || user.role === 'Buyer'
  const showsDistrict = user.role === 'Farmer' || user.role === 'Buyer' || user.role === 'Officer'
  const showsBusinessDetails = user.role === 'Buyer'
  const showsFieldPlot = user.role === 'Farmer'

  const schema = useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .trim()
          .max(100, t('common:validation.nameTooLong'))
          .optional(),
        displayName: z.string().trim().max(60).optional(),
        email: z
          .string()
          .trim()
          .max(256, t('common:validation.emailTooLong'))
          .optional()
          .refine((value) => !value || z.string().email().safeParse(value).success, {
            message: t('common:validation.emailInvalid'),
          }),
        phoneNumber: z
          .string()
          .trim()
          .optional()
          .refine((value) => !value || isValidPhone(value), {
            message: t('common:validation.phoneNumberInvalid'),
          }),
        nic: z
          .string()
          .trim()
          .optional()
          .refine((value) => !value || isValidNic(value), { message: t('common:validation.nicInvalid') }),
        district: z.string().trim().optional(),
        businessRegistrationNumber: z
          .string()
          .trim()
          .max(50, t('common:validation.businessRegistrationNumberTooLong'))
          .optional(),
        businessName: z.string().trim().max(100).optional(),
        fieldPlotNumber: z
          .string()
          .trim()
          .max(50, t('common:validation.fieldPlotNumberTooLong'))
          .optional(),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', district: '' },
  })

  function submit(values: z.output<typeof schema>) {
    const changes: AdminUpdateUserProfileRequest = {}
    if (values.fullName && values.fullName !== user.fullName) {
      changes.fullName = values.fullName
    }
    if (values.displayName) {
      changes.displayName = values.displayName
    }
    if (values.email && values.email !== user.email) {
      changes.email = values.email
    }
    if (values.phoneNumber) {
      changes.phoneNumber = values.phoneNumber
    }
    if (showsNic && values.nic) {
      changes.nic = values.nic
    }
    if (showsDistrict && values.district && values.district !== user.district) {
      changes.district = values.district
    }
    if (showsBusinessDetails && values.businessRegistrationNumber) {
      changes.businessRegistrationNumber = values.businessRegistrationNumber
    }
    if (showsBusinessDetails && values.businessName) {
      changes.businessName = values.businessName
    }
    if (showsFieldPlot && values.fieldPlotNumber) {
      changes.fieldPlotNumber = values.fieldPlotNumber
    }
    onSubmit(changes)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-sm text-text-secondary">{t('orders:admin.editUserKeepCurrent')}</p>

      <Input
        label={t('common:fields.fullName')}
        placeholder={user.fullName}
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <Input
        label={t('orders:admin.editUserDisplayName')}
        placeholder={t('orders:admin.editUserUnchanged')}
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <Input
        label={t('common:fields.email')}
        type="email"
        placeholder={user.email}
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label={t('common:fields.phoneNumber')}
        type="tel"
        placeholder={t('orders:admin.editUserUnchanged')}
        error={errors.phoneNumber?.message}
        {...register('phoneNumber')}
      />
      {showsNic && (
        <Input
          label={t('common:fields.nic')}
          placeholder={t('orders:admin.editUserUnchanged')}
          error={errors.nic?.message}
          {...register('nic')}
        />
      )}
      {showsDistrict && (
        <DistrictSelect
          error={errors.district?.message}
          emptyOptionLabel={user.district ?? undefined}
          {...register('district')}
        />
      )}
      {showsBusinessDetails && (
        <>
          <Input
            label={t('common:fields.businessName')}
            placeholder={t('orders:admin.editUserUnchanged')}
            error={errors.businessName?.message}
            {...register('businessName')}
          />
          <Input
            label={t('common:fields.businessRegistrationNumber')}
            placeholder={t('orders:admin.editUserUnchanged')}
            error={errors.businessRegistrationNumber?.message}
            {...register('businessRegistrationNumber')}
          />
        </>
      )}
      {showsFieldPlot && (
        <Input
          label={t('common:fields.fieldPlotNumber')}
          placeholder={t('orders:admin.editUserUnchanged')}
          error={errors.fieldPlotNumber?.message}
          {...register('fieldPlotNumber')}
        />
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('orders:admin.editUserSaving') : t('orders:admin.editUserSave')}
      </Button>
    </form>
  )
}
