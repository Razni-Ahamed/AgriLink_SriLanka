import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useAuthStore } from './authStore'
import { register as registerRequest } from './api'

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.login)

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(1, t('common:validation.fullNameRequired')),
        email: z.string().email(t('common:validation.emailInvalid')),
        password: z.string().min(8, t('common:validation.passwordMin')),
        nic: z.string().min(1, t('common:validation.nicRequired')),
        district: z.string().min(1, t('common:validation.districtRequired')),
      }),
    [t],
  )

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      setSession(data.token, data.role)
      navigate('/', { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-10">
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
      >
        <Card className="w-full max-w-sm">
          <div className="mb-4 flex justify-center">
            <LanguageSwitcher />
          </div>

          <h1 className="mb-1 font-display text-2xl text-brand-forest">
            {t('auth:register.title')}
          </h1>
          <p className="mb-6 text-sm text-text-secondary">{t('auth:register.subtitle')}</p>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
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
            <Input
              label={t('common:fields.district')}
              error={errors.district?.message}
              {...registerField('district')}
            />
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
