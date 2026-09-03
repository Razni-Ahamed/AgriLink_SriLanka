import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useAuthStore } from './authStore'
import { login } from './api'

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const location = useLocation()
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
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.token, data.role)
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(redirectTo, { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4">
      {/* `layout` tweens the height change when switching language — Sinhala and
          Tamil strings wrap differently, which otherwise snaps the card. */}
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

          <h1 className="mb-1 font-display text-2xl text-brand-forest">{t('common:appName')}</h1>
          <p className="mb-6 text-sm text-text-secondary">{t('auth:login.subtitle')}</p>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <Input
              label={t('common:fields.email')}
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={t('common:fields.password')}
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            {mutation.isError && (
              <p className="text-sm text-state-danger">{t('auth:login.error')}</p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('auth:login.submitting') : t('auth:login.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            {t('auth:login.noAccount')}{' '}
            <a href="/register" className="text-brand-forest hover:underline">
              {t('auth:login.registerLink')}
            </a>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
