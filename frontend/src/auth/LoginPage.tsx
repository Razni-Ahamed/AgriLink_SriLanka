import { useMemo } from 'react'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuthStore } from './authStore'
import { lockoutMessage, login } from './api'

/**
 * What to tell someone whose sign-in failed. The API answers a pending or rejected application
 * with 403 (the rejection carrying the officer's reason) and a lockout with 429; only a 401 means
 * the email or password was wrong. Every failure used to show "Invalid email or password".
 */
function loginErrorLines(error: unknown, tArg: unknown): string[] {
  // Typed loosely, like parseApiError's, so one helper serves any namespace's t.
  const t = tArg as (key: string, options?: Record<string, unknown>) => string
  const lockout = lockoutMessage(error)
  if (lockout) {
    return [lockout]
  }
  if (!isAxiosError(error)) {
    return [t('auth:login.serverError')]
  }
  if (!error.response) {
    return [t('auth:register.networkError')]
  }

  const { status, data } = error.response
  const body = (data ?? {}) as { message?: unknown; reason?: unknown }
  if (status === 403) {
    const message = typeof body.message === 'string' ? body.message : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason || message.toLowerCase().includes('not approved')) {
      return [
        t('auth:login.rejectedMessage'),
        ...(reason ? [t('auth:login.rejectedReason', { reason })] : []),
      ]
    }
    return [t('auth:login.pendingMessage')]
  }
  if (status === 400 || status === 401) {
    return [t('auth:login.error')]
  }
  return [t('auth:login.serverError')]
}

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
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle variant="compact" />
          </div>

          <h1 className="mb-1 font-display text-2xl text-brand-forest">
            <Link to="/" className="hover:underline">
              {t('common:appName')}
            </Link>
          </h1>
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
              <div role="alert" className="flex flex-col gap-1 text-sm text-state-danger">
                {loginErrorLines(mutation.error, t).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
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
