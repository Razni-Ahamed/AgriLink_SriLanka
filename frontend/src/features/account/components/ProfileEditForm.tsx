import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { UsernameAvailabilityHint } from '@/components/ui/UsernameAvailabilityHint'
import {
  deleteProfilePhoto,
  displayNameOf,
  updateProfile,
  uploadProfilePhoto,
  type UpdateProfileRequest,
  type UserProfileResponse,
} from '@/auth/api'
import { useAuthStore } from '@/auth/authStore'
import { parseApiError } from '@/lib/apiErrors'
import { useUiStore } from '@/lib/useUiStore'
import { useUsernameAvailability } from '@/lib/useUsernameAvailability'
import { formatDate } from '@/lib/utils'
import {
  BUSINESS_NAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  FIELD_PLOT_NUMBER_MAX_LENGTH,
  normalizeUsername,
  usernameProblem,
  type UsernameProblem,
} from '@/lib/validation'

/** Mirrors ProfilePhotoProcessor on the server: the size is re-checked there before decoding. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const USERNAME_MESSAGE_KEYS = {
  tooShort: 'common:validation.usernameTooShort',
  tooLong: 'common:validation.usernameTooLong',
  invalid: 'common:validation.usernameInvalid',
  reserved: 'common:validation.usernameReserved',
} as const satisfies Record<UsernameProblem, string>

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
}

type PhotoChange = { kind: 'none' } | { kind: 'remove' } | { kind: 'upload'; file: File; previewUrl: string }

interface ProfileEditFormProps {
  user: UserProfileResponse
  /** Back to the read-only view, after saving or cancelling. */
  onDone: () => void
}

/**
 * The General tab's edit mode. Every input starts empty with the current value as its placeholder:
 * leaving one empty keeps that value, and only fields that actually change are sent. The photo is
 * previewed locally and uploaded only when the user saves.
 */
export function ProfileEditForm({ user, onDone }: ProfileEditFormProps) {
  const { t } = useTranslation(['auth', 'common'])
  const addToast = useUiStore((state) => state.addToast)
  const setUser = useAuthStore((state) => state.setUser)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const usernameHintId = useId()
  const displayNameHintId = useId()
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'none' })
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [clearDisplayName, setClearDisplayName] = useState(false)

  const usernameLockedUntil =
    user.usernameChangeAvailableAt && new Date(user.usernameChangeAvailableAt) > new Date()
      ? user.usernameChangeAvailableAt
      : null

  const schema = useMemo(
    () =>
      z.object({
        displayName: z
          .string()
          .trim()
          .max(DISPLAY_NAME_MAX_LENGTH, t('auth:profile.edit.displayNameTooLong'))
          .refine((value) => !hasControlCharacters(value), t('auth:profile.edit.displayNameInvalid')),
        username: z
          .string()
          .transform(normalizeUsername)
          .superRefine((username, ctx) => {
            const problem = username ? usernameProblem(username) : null
            if (problem) {
              ctx.addIssue({ code: 'custom', message: t(USERNAME_MESSAGE_KEYS[problem]) })
            }
          }),
        fieldPlotNumber: z
          .string()
          .trim()
          .max(FIELD_PLOT_NUMBER_MAX_LENGTH, t('common:validation.fieldPlotNumberTooLong')),
        businessName: z.string().trim().max(BUSINESS_NAME_MAX_LENGTH, t('auth:profile.edit.businessNameTooLong')),
      }),
    [t],
  )

  type FormInput = z.input<typeof schema>
  type FormOutput = z.output<typeof schema>

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { displayName: '', username: '', fieldPlotNumber: '', businessName: '' },
  })

  const typedUsername = watch('username') ?? ''
  const usernameStatus = useUsernameAvailability(typedUsername, {
    enabled: !usernameLockedUntil && typedUsername.trim().length > 0,
    currentUsername: user.username,
  })

  // A preview URL holds the file in memory until revoked.
  const previewUrl = photo.kind === 'upload' ? photo.previewUrl : null
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const mutation = useMutation({
    mutationFn: async ({ changes, photoChange }: { changes: UpdateProfileRequest; photoChange: PhotoChange }) => {
      let latest: UserProfileResponse | null = null
      if (photoChange.kind === 'upload') {
        latest = await uploadProfilePhoto(photoChange.file)
      } else if (photoChange.kind === 'remove') {
        latest = await deleteProfilePhoto()
      }
      if (Object.keys(changes).length > 0) {
        latest = await updateProfile(changes)
      }
      return latest
    },
    onSuccess: (latest) => {
      if (latest) {
        setUser(latest)
      }
      addToast({ type: 'success', message: t('auth:profile.edit.success') })
      onDone()
    },
    onError: (error) => {
      const parsed = parseApiError(error, t, { genericErrorKey: 'auth:profile.edit.error' })
      addToast({ type: 'error', message: parsed.generalErrors[0] ?? t('auth:profile.edit.error') })
    },
    // Even a partial failure (photo saved, then the details refused) changed something on the
    // server, so re-read the profile either way to keep the header truthful.
    onSettled: () => refreshUser(),
  })

  function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still fires a change
    if (!file) {
      return
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError(t('auth:profile.edit.photoWrongType'))
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('auth:profile.edit.photoTooLarge'))
      return
    }
    setPhotoError(null)
    setPhoto({ kind: 'upload', file, previewUrl: URL.createObjectURL(file) })
  }

  function handleRemovePhoto() {
    setPhotoError(null)
    setPhoto(user.profilePhotoUrl ? { kind: 'remove' } : { kind: 'none' })
  }

  const onSubmit = handleSubmit((values) => {
    const changes: UpdateProfileRequest = {}
    if (clearDisplayName) {
      changes.displayName = ''
    } else if (values.displayName && values.displayName !== (user.displayName ?? '')) {
      changes.displayName = values.displayName
    }
    if (!usernameLockedUntil && values.username && values.username !== user.username) {
      if (usernameStatus === 'taken') {
        setError('username', { type: 'server', message: t('common:validation.usernameTaken') })
        return
      }
      changes.username = values.username
    }
    if (user.role === 'Farmer' && values.fieldPlotNumber && values.fieldPlotNumber !== user.fieldPlotNumber) {
      changes.fieldPlotNumber = values.fieldPlotNumber
    }
    if (user.role === 'Buyer' && values.businessName && values.businessName !== user.businessName) {
      changes.businessName = values.businessName
    }

    if (Object.keys(changes).length === 0 && photo.kind === 'none') {
      addToast({ type: 'info', message: t('auth:profile.edit.noChanges') })
      onDone()
      return
    }

    mutation.mutate({ changes, photoChange: photo })
  })

  const name = displayNameOf(user)
  const showsPhoto = photo.kind === 'upload' || (photo.kind === 'none' && !!user.profilePhotoUrl)

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-text-primary">{t('auth:profile.edit.photoLabel')}</legend>
        <div className="flex flex-wrap items-center gap-4">
          {photo.kind === 'upload' ? (
            // A local preview of the user's own file, not a stored URL, so it bypasses UserAvatar's
            // https-only rule by design.
            <img
              src={photo.previewUrl}
              alt={name}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <UserAvatar
              photoUrl={photo.kind === 'remove' ? null : user.profilePhotoUrl}
              role={user.role}
              name={name}
              size="lg"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => photoInputRef.current?.click()}>
              {t('auth:profile.edit.changePhoto')}
            </Button>
            {showsPhoto && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                {t('auth:profile.edit.removePhoto')}
              </Button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept={ACCEPTED_PHOTO_TYPES.join(',')}
            aria-label={t('auth:profile.edit.photoLabel')}
            className="sr-only"
            tabIndex={-1}
            onChange={handlePhotoSelected}
          />
        </div>
        <p className="text-xs text-text-secondary" aria-live="polite">
          {photo.kind === 'upload'
            ? t('auth:profile.edit.photoPreview')
            : photo.kind === 'remove'
              ? t('auth:profile.edit.photoWillBeRemoved')
              : t('auth:profile.edit.photoHint')}
        </p>
        {photoError && (
          <p role="alert" className="text-sm text-state-danger">
            {photoError}
          </p>
        )}
      </fieldset>

      <div>
        <Input
          label={t('auth:profile.general.displayName')}
          placeholder={user.displayName ?? user.fullName}
          maxLength={DISPLAY_NAME_MAX_LENGTH * 2}
          disabled={clearDisplayName}
          aria-describedby={displayNameHintId}
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <div id={displayNameHintId} className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
          <span>
            {clearDisplayName ? t('auth:profile.edit.usingFullName') : t('auth:profile.edit.displayNameHint')}
          </span>
          {user.displayName && (
            <button
              type="button"
              className="text-brand-forest underline-offset-2 hover:underline"
              aria-pressed={clearDisplayName}
              onClick={() => setClearDisplayName((value) => !value)}
            >
              {clearDisplayName ? t('auth:profile.edit.cancel') : t('auth:profile.edit.useFullName')}
            </button>
          )}
        </div>
      </div>

      <div>
        <Input
          label={t('common:fields.username')}
          placeholder={user.username}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={64}
          disabled={!!usernameLockedUntil}
          aria-describedby={usernameHintId}
          error={errors.username?.message}
          {...register('username')}
        />
        <div id={usernameHintId}>
          {usernameLockedUntil ? (
            <p className="mt-1 text-xs text-text-secondary">
              {t('auth:profile.edit.usernameLocked', { date: formatDate(usernameLockedUntil) })}
            </p>
          ) : (
            <>
              <UsernameAvailabilityHint status={usernameStatus} />
              <p className="text-xs text-text-secondary">{t('auth:profile.edit.usernameEvery30Days')}</p>
            </>
          )}
        </div>
      </div>

      {user.role === 'Farmer' && (
        <Input
          label={t('common:fields.fieldPlotNumber')}
          placeholder={user.fieldPlotNumber ?? ''}
          maxLength={FIELD_PLOT_NUMBER_MAX_LENGTH * 2}
          error={errors.fieldPlotNumber?.message}
          {...register('fieldPlotNumber')}
        />
      )}
      {user.role === 'Buyer' && (
        <Input
          label={t('common:fields.businessName')}
          placeholder={user.businessName ?? ''}
          maxLength={BUSINESS_NAME_MAX_LENGTH * 2}
          error={errors.businessName?.message}
          {...register('businessName')}
        />
      )}
      {(user.role === 'Farmer' || user.role === 'Buyer') && (
        <p className="-mt-3 text-xs text-text-secondary">{t('auth:profile.edit.keepCurrent')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={mutation.isPending}>
          {mutation.isPending ? t('auth:profile.edit.updating') : t('auth:profile.edit.updateProfile')}
        </Button>
        <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onDone}>
          {t('auth:profile.edit.cancel')}
        </Button>
      </div>
    </form>
  )
}
