import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/auth/authStore'
import { parseApiError } from '@/lib/apiErrors'
import { useUiStore } from '@/lib/useUiStore'
import {
  useCreateChangeRequest,
  useSecuritySettings,
  useUpdatePhone,
  useVerifyPassword,
  useWithdrawChangeRequest,
} from '../hooks/useSecuritySettings'
import { ChangePasswordPanel } from './ChangePasswordPanel'
import { SecurityFieldRow } from './SecurityFieldRow'
import type { ChangeRequestField } from '../api/securityApi'

const UNLOCK_TIMEOUT_MS = 5 * 60 * 1000

/**
 * The real Security tab: view-only by default, unlocked by re-entering the current password.
 * Once unlocked, direct changes (phone; for Admin, full name and email) save immediately, and
 * approval-needed changes (full name/NIC/email for everyone else) open a Pending request. The
 * password typed to unlock lives only in this component's state — cleared on lock, on
 * unmount (the pop-up closing or the tab changing away, since ProfileDialog swaps this
 * component out entirely), and after 5 minutes without an edit.
 */
export function SecuritySettingsTab() {
  const { t } = useTranslation(['auth', 'common'])
  const addToast = useUiStore((state) => state.addToast)
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.login)
  const isAdmin = role === 'Admin'

  const { data, isLoading } = useSecuritySettings()
  const verifyPasswordMutation = useVerifyPassword()
  const updatePhoneMutation = useUpdatePhone()
  const createChangeRequestMutation = useCreateChangeRequest()
  const withdrawMutation = useWithdrawChangeRequest()

  const [unlocked, setUnlocked] = useState(false)
  const [showUnlockForm, setShowUnlockForm] = useState(false)
  const [unlockInput, setUnlockInput] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  // The re-authenticated password, kept only for this edit session — see the class doc above.
  const [password, setPassword] = useState('')
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLockTimer = () => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current)
      lockTimerRef.current = null
    }
  }

  const lock = useCallback(() => {
    clearLockTimer()
    setUnlocked(false)
    setShowUnlockForm(false)
    setPassword('')
    setUnlockInput('')
    setUnlockError(null)
  }, [])

  const resetLockTimer = useCallback(() => {
    clearLockTimer()
    lockTimerRef.current = setTimeout(lock, UNLOCK_TIMEOUT_MS)
  }, [lock])

  // Unmounting means the pop-up closed or the tab changed — either way, forget the password.
  useEffect(() => () => clearLockTimer(), [])

  async function handleUnlockSubmit(event: FormEvent) {
    event.preventDefault()
    setUnlockError(null)
    try {
      await verifyPasswordMutation.mutateAsync(unlockInput)
      setPassword(unlockInput)
      setUnlockInput('')
      setUnlocked(true)
      setShowUnlockForm(false)
      resetLockTimer()
    } catch (error) {
      const parsed = parseApiError(error, t, { genericErrorKey: 'auth:profile.security.wrongPassword' })
      setUnlockError(parsed.generalErrors[0] ?? t('auth:profile.security.wrongPassword'))
    }
  }

  async function handlePhoneSave(value: string) {
    resetLockTimer()
    try {
      await updatePhoneMutation.mutateAsync({ currentPassword: password, phoneNumber: value })
      addToast({ type: 'success', message: t('auth:profile.security.phoneUpdated') })
    } catch (error) {
      const parsed = parseApiError(error, t, { genericErrorKey: 'auth:profile.security.saveError' })
      addToast({ type: 'error', message: parsed.generalErrors[0] ?? t('auth:profile.security.saveError') })
    }
  }

  async function handleFieldChange(field: ChangeRequestField, value: string) {
    resetLockTimer()
    try {
      const result = await createChangeRequestMutation.mutateAsync({
        request: { currentPassword: password, field, newValue: value },
        isAdmin,
      })
      if (result.kind === 'appliedWithToken') {
        // An admin's own email change rotates the security stamp; adopt the fresh token so this
        // session keeps working, exactly like a password change does.
        setSession(result.auth.token, result.auth.role)
        addToast({ type: 'success', message: t('auth:profile.security.saved') })
      } else if (result.kind === 'applied') {
        addToast({ type: 'success', message: t('auth:profile.security.saved') })
      } else {
        addToast({ type: 'success', message: t('auth:profile.security.requestSubmitted') })
      }
    } catch (error) {
      const parsed = parseApiError(error, t, { genericErrorKey: 'auth:profile.security.saveError' })
      addToast({ type: 'error', message: parsed.generalErrors[0] ?? t('auth:profile.security.saveError') })
    }
  }

  async function handleWithdraw(requestId: number) {
    try {
      await withdrawMutation.mutateAsync(requestId)
      addToast({ type: 'success', message: t('auth:profile.security.withdrawn') })
    } catch {
      addToast({ type: 'error', message: t('auth:profile.security.withdrawError') })
    }
  }

  if (isLoading || !data || !user) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
        <Spinner size="sm" />
        {t('auth:profile.loading')}
      </div>
    )
  }

  const canChange = new Set(data.canChange)
  const canRequest = new Set(data.canRequest)
  const findPending = (field: ChangeRequestField) =>
    data.changeRequests.find((r) => r.field === field && r.status === 'Pending')
  const findDecided = (field: ChangeRequestField) =>
    data.changeRequests.filter((r) => r.field === field && r.status !== 'Pending')

  return (
    <div className="flex flex-col gap-6">
      {canChange.has('password') && (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-base text-text-primary">{t('profile.security.passwordHeading')}</h3>
            <p className="font-mono text-sm text-text-primary">••••••••</p>
          </div>
          {unlocked && <ChangePasswordPanel />}
        </section>
      )}

      {canChange.has('phone') && (
        <SecurityFieldRow
          label={t('common:fields.phoneNumber')}
          currentValue={data.phoneNumber}
          mode="direct"
          unlocked={unlocked}
          clearable={role === 'Officer' || role === 'Admin'}
          inputType="tel"
          onSubmit={handlePhoneSave}
          isSubmitting={updatePhoneMutation.isPending}
          onActivity={resetLockTimer}
        />
      )}

      {(canChange.has('fullName') || canRequest.has('fullName')) && (
        <SecurityFieldRow
          label={t('common:fields.fullName')}
          currentValue={user.fullName}
          mode={canChange.has('fullName') ? 'direct' : 'request'}
          unlocked={unlocked}
          onSubmit={(value) => handleFieldChange('FullName', value)}
          isSubmitting={createChangeRequestMutation.isPending}
          pending={findPending('FullName')}
          recentDecided={findDecided('FullName')}
          onWithdraw={handleWithdraw}
          isWithdrawing={withdrawMutation.isPending}
          onActivity={resetLockTimer}
        />
      )}

      {canRequest.has('nic') && (
        <SecurityFieldRow
          label={t('common:fields.nic')}
          currentValue={data.nic}
          mode="request"
          unlocked={unlocked}
          onSubmit={(value) => handleFieldChange('NIC', value)}
          isSubmitting={createChangeRequestMutation.isPending}
          pending={findPending('NIC')}
          recentDecided={findDecided('NIC')}
          onWithdraw={handleWithdraw}
          isWithdrawing={withdrawMutation.isPending}
          onActivity={resetLockTimer}
        />
      )}

      {(canChange.has('email') || canRequest.has('email')) && (
        <SecurityFieldRow
          label={t('common:fields.email')}
          currentValue={user.email}
          mode={canChange.has('email') ? 'direct' : 'request'}
          unlocked={unlocked}
          inputType="email"
          onSubmit={(value) => handleFieldChange('Email', value)}
          isSubmitting={createChangeRequestMutation.isPending}
          pending={findPending('Email')}
          recentDecided={findDecided('Email')}
          onWithdraw={handleWithdraw}
          isWithdrawing={withdrawMutation.isPending}
          onActivity={resetLockTimer}
        />
      )}

      {!unlocked && !showUnlockForm && (
        <Button type="button" onClick={() => setShowUnlockForm(true)} className="self-start">
          {t('auth:profile.security.editSecurityDetails')}
        </Button>
      )}

      {!unlocked && showUnlockForm && (
        <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-3 rounded-2xl border border-brand-forest/10 p-4">
          <p className="text-sm text-text-secondary">{t('auth:profile.security.unlockPrompt')}</p>
          <PasswordInput
            label={t('common:fields.password')}
            autoComplete="current-password"
            value={unlockInput}
            onChange={(event) => setUnlockInput(event.target.value)}
            error={unlockError ?? undefined}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={verifyPasswordMutation.isPending}>
              {t('auth:profile.security.unlock')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowUnlockForm(false)
                setUnlockInput('')
                setUnlockError(null)
              }}
            >
              {t('auth:profile.edit.cancel')}
            </Button>
          </div>
        </form>
      )}

      {unlocked && (
        <Button type="button" variant="ghost" onClick={lock} className="self-start">
          {t('auth:profile.security.doneEditing')}
        </Button>
      )}
    </div>
  )
}
