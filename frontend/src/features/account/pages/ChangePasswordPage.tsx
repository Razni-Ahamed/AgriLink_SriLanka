import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useUiStore } from '@/lib/useUiStore'
import { useAuthStore } from '@/auth/authStore'
import { changePassword } from '@/auth/api'
import { ChangePasswordForm, type ChangePasswordFormValues } from '../components/ChangePasswordForm'

/** Reachable by every role, including Admin — AdminLoginPage signs into a separate entry point,
 *  but from there on the admin shares this same layout and account settings. */
export function ChangePasswordPage() {
  const { t } = useTranslation(['auth', 'common'])
  const addToast = useUiStore((state) => state.addToast)
  const setSession = useAuthStore((state) => state.login)
  // Remounts the form on success so its fields clear — resetting via react-hook-form's own
  // reset() would also need to happen only on success, not on every submit attempt.
  const [formKey, setFormKey] = useState(0)

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      // The backend rotates the security stamp on a password change, which invalidates every
      // token issued before it — including the one this request was just authenticated with —
      // so the session must adopt the fresh token the response carries to keep working.
      setSession(data.token, data.role)
      setFormKey((key) => key + 1)
      addToast({ type: 'success', message: t('auth:changePassword.success') })
    },
    onError: () => {
      addToast({ type: 'error', message: t('auth:changePassword.error') })
    },
  })

  function handleSubmit(values: ChangePasswordFormValues) {
    mutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('auth:changePassword.title')}</h1>
        <p className="text-sm text-text-secondary">{t('auth:changePassword.subtitle')}</p>
      </div>

      <Card className="max-w-sm">
        <ChangePasswordForm
          key={formKey}
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </Card>
    </div>
  )
}
