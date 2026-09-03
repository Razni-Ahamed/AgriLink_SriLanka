import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import axios from 'axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Gear } from '@/components/ui/icons'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useAuthStore } from './authStore'
import { adminLogin } from './api'

export function AdminLoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.login)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('common:validation.emailInvalid')),
        password: z.string().min(1, t('common:validation.passwordRequired')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      setSession(data.token, data.role)
      navigate('/admin', { replace: true })
    },
  })

  // A 403 means the credentials were right but the account isn't an admin —
  // worth saying, rather than implying the password was wrong.
  const isForbidden =
    axios.isAxiosError(mutation.error) && mutation.error.response?.status === 403

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4">
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

          <div className="mb-4 flex items-center gap-3">
            <IconBadge tone="forest">
              <Gear size={20} weight="duotone" />
            </IconBadge>
            <div>
              <h1 className="font-display text-2xl text-brand-forest">
                {t('auth:adminLogin.title')}
              </h1>
              <p className="text-sm text-text-secondary">{t('auth:adminLogin.subtitle')}</p>
            </div>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <Input
              label={t('common:fields.email')}
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('common:fields.password')}
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            {mutation.isError && (
              <p className="text-sm text-state-danger">
                {isForbidden ? t('auth:adminLogin.forbidden') : t('auth:adminLogin.error')}
              </p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('auth:adminLogin.submitting') : t('auth:adminLogin.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            <Link to="/login" className="text-brand-forest hover:underline">
              {t('auth:adminLogin.backToLogin')}
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
