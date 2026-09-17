import { useState } from 'react'
import { ArrowBendDownLeft } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Shake } from '@/components/ui/motion/Shake'
import { useUiStore } from '@/lib/useUiStore'
import type { AdvisoryResponse, ReviewAdvisoryRequest } from '@/types/dto/advisories'
import { useApproveAdvisory, useRejectAdvisory } from '../hooks/useAdvisories'

interface ApproveRejectControlsProps {
  advisory: AdvisoryResponse
  shakeTrigger: boolean
  onApproved: () => void
  onRejected: () => void
}

type FieldErrors = { treatment?: string; disease?: string }

export function ApproveRejectControls({
  advisory,
  shakeTrigger,
  onApproved,
  onRejected,
}: ApproveRejectControlsProps) {
  const { t } = useTranslation('issues')
  const addToast = useUiStore((state) => state.addToast)
  const approve = useApproveAdvisory(advisory.advisoryId)
  const reject = useRejectAdvisory(advisory.advisoryId)
  const [note, setNote] = useState('')
  const [treatment, setTreatment] = useState('')
  const [diseaseKey, setDiseaseKey] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const isBusy = approve.isPending || reject.isPending
  const diagnosis = advisory.photoDiagnosis
  // Held back (Draft): the farmer has had no advice yet, so confirming needs the officer's treatment.
  const treatmentRequiredToConfirm = Boolean(diagnosis) && advisory.status === 'Draft'

  // Mirrors the backend's rules for a photo diagnosis (AdvisoriesController.Review), so the
  // officer is told what is missing before a request is refused.
  function validate(action: 'approve' | 'reject'): FieldErrors {
    if (!diagnosis) {
      return {}
    }
    const found: FieldErrors = {}
    if (action === 'approve') {
      if (diseaseKey && diseaseKey !== diagnosis.diseaseKey) {
        found.disease = t('advisory.review.useCorrectToChange')
      }
      if (treatmentRequiredToConfirm && !treatment.trim()) {
        found.treatment = t('advisory.review.treatmentRequired')
      }
    } else {
      if (!diseaseKey) {
        found.disease = t('advisory.review.diseaseRequired')
      }
      if (!treatment.trim()) {
        found.treatment = t('advisory.review.treatmentRequired')
      }
    }
    return found
  }

  function review(action: 'approve' | 'reject') {
    const found = validate(action)
    setErrors(found)
    if (found.treatment || found.disease) {
      return
    }

    const body: ReviewAdvisoryRequest = {
      note: note.trim() || undefined,
      treatment: treatment.trim() || undefined,
      diseaseKey: action === 'reject' && diagnosis ? diseaseKey : undefined,
    }

    if (action === 'approve') {
      approve.mutate(body, {
        onSuccess: () => {
          addToast({
            type: 'success',
            message: diagnosis ? t('advisory.review.confirmed') : t('advisory.approved'),
          })
          onApproved()
        },
        onError: () => addToast({ type: 'error', message: t('advisory.approveError') }),
      })
    } else {
      reject.mutate(body, {
        onSuccess: () => {
          addToast({
            type: 'info',
            message: diagnosis ? t('advisory.review.corrected') : t('advisory.rejected'),
          })
          onRejected()
        },
        onError: () => addToast({ type: 'error', message: t('advisory.rejectError') }),
      })
    }
  }

  return (
    <Shake trigger={shakeTrigger}>
      <div className="flex flex-col gap-3">
        {diagnosis?.suggestedTreatment && (
          <div className="flex flex-col gap-2 rounded-xl border border-brand-forest/20 bg-brand-forest/5 p-3">
            <div>
              <h4 className="text-sm font-medium text-brand-forest">
                {t('advisory.review.suggestedTitle')}
              </h4>
              <p className="text-xs text-text-secondary">{t('advisory.review.suggestedHint')}</p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {diagnosis.suggestedTreatment}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={isBusy}
              onClick={() => {
                setTreatment(diagnosis.suggestedTreatment ?? '')
                setErrors((current) => ({ ...current, treatment: undefined }))
              }}
            >
              <ArrowBendDownLeft size={16} weight="duotone" />
              {t('advisory.review.useSuggested')}
            </Button>
          </div>
        )}

        {diagnosis && (
          <>
            <Textarea
              label={
                treatmentRequiredToConfirm
                  ? t('advisory.review.treatmentLabelRequired')
                  : t('advisory.review.treatmentLabelOptional')
              }
              placeholder={t('advisory.review.treatmentPlaceholder')}
              rows={4}
              maxLength={2000}
              value={treatment}
              disabled={isBusy}
              error={errors.treatment}
              onChange={(event) => setTreatment(event.target.value)}
            />
            <Select
              label={t('advisory.review.correctDiseaseLabel')}
              value={diseaseKey}
              disabled={isBusy}
              error={errors.disease}
              onChange={(event) => setDiseaseKey(event.target.value)}
            >
              <option value="">{t('advisory.review.correctDiseasePlaceholder')}</option>
              {(diagnosis.diseaseOptions ?? []).map((option) => (
                <option key={option.key} value={option.key}>
                  {option.name}
                </option>
              ))}
            </Select>
          </>
        )}

        {/* Optional — an officer can still approve/reject with nothing typed here, same as
            before this existed. When filled, it reaches the farmer as part of their
            approved/rejected notification, and is kept on the advisory for this officer's own
            review history. */}
        <Textarea
          label={t('advisory.reviewNoteLabel')}
          placeholder={t('advisory.reviewNotePlaceholder')}
          rows={3}
          maxLength={1000}
          value={note}
          disabled={isBusy}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            isLoading={approve.isPending}
            disabled={reject.isPending}
            onClick={() => review('approve')}
          >
            {diagnosis ? t('advisory.review.confirmDiagnosis') : t('advisory.approve')}
          </Button>
          <Button
            variant="danger"
            isLoading={reject.isPending}
            disabled={approve.isPending}
            onClick={() => review('reject')}
          >
            {diagnosis ? t('advisory.review.correctDiagnosis') : t('advisory.reject')}
          </Button>
        </div>
      </div>
    </Shake>
  )
}
