import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/lib/useUiStore'
import { useAuthStore } from '@/auth/authStore'
import { changePassword } from '@/auth/api'
import { ChangePasswordForm, type ChangePasswordFormValues } from './ChangePasswordForm'

/**
 * The working change-password form: submits, adopts the fresh token, and clears itself on success.
 * Shared by the /account/password page and the profile pop-up's Security tab.
 */
export function ChangePasswordPanel() {
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

  return <ChangePasswordForm key={formKey} isSubmitting={mutation.isPending} onSubmit={handleSubmit} />
}
