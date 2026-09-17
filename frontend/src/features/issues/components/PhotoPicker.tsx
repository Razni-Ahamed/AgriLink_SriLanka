import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Trash } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { preparePhotoForUpload, type PhotoProblem } from '../lib/preparePhoto'

interface PhotoPickerProps {
  value?: File
  onChange: (photo: File | undefined) => void
  /** Lets the form hold submission while a picked photo is still being shrunk. */
  onProcessingChange?: (isProcessing: boolean) => void
  disabled?: boolean
}

/**
 * Optional photo for an issue report. On phones the file input offers the camera as well as the
 * gallery. A picked photo is shrunk and re-encoded before it is handed to the form, so only the
 * prepared file is ever uploaded.
 */
export function PhotoPicker({ value, onChange, onProcessingChange, disabled }: PhotoPickerProps) {
  const { t } = useTranslation('issues')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [problem, setProblem] = useState<PhotoProblem | null>(null)
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again after removing it still fires a change event.
    event.target.value = ''
    if (!file) {
      return
    }

    setProblem(null)
    setIsProcessing(true)
    onProcessingChange?.(true)
    try {
      const prepared = await preparePhotoForUpload(file)
      if (prepared.ok) {
        onChange(prepared.file)
      } else {
        setProblem(prepared.problem)
      }
    } finally {
      setIsProcessing(false)
      onProcessingChange?.(false)
    }
  }

  function remove() {
    setProblem(null)
    onChange(undefined)
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={inputId} className="font-medium text-text-primary">
        {t('form.photo.label')}
      </label>
      <p className="text-xs text-text-secondary">{t('form.photo.hint')}</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || isProcessing}
        onChange={handleFileChosen}
      />

      {previewUrl && (
        <img
          src={previewUrl}
          alt={t('form.photo.previewAlt')}
          className="max-h-64 w-full rounded-xl border border-text-secondary/20 object-contain"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={() => inputRef.current?.click()}
        >
          {isProcessing ? <Spinner size="sm" /> : <Camera size={16} weight="duotone" />}
          {isProcessing
            ? t('form.photo.processing')
            : value
              ? t('form.photo.change')
              : t('form.photo.add')}
        </Button>
        {value && !isProcessing && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={remove}>
            <Trash size={16} weight="duotone" />
            {t('form.photo.remove')}
          </Button>
        )}
      </div>

      {problem && (
        <p role="alert" className="text-state-danger">
          {t(`form.photo.${problem}`)}
        </p>
      )}
    </div>
  )
}
