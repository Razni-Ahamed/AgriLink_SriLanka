import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Shake } from '@/components/ui/motion/Shake'
import { useUiStore } from '@/lib/useUiStore'
import { useApproveAdvisory, useRejectAdvisory } from '../hooks/useAdvisories'

interface ApproveRejectControlsProps {
  advisoryId: number
  shakeTrigger: boolean
  onApproved: () => void
  onRejected: () => void
}

export function ApproveRejectControls({
  advisoryId,
  shakeTrigger,
  onApproved,
  onRejected,
}: ApproveRejectControlsProps) {
  const { t } = useTranslation('issues')
  const addToast = useUiStore((state) => state.addToast)
  const approve = useApproveAdvisory(advisoryId)
  const reject = useRejectAdvisory(advisoryId)
  const [note, setNote] = useState('')

  const isBusy = approve.isPending || reject.isPending

  return (
    <Shake trigger={shakeTrigger}>
      <div className="flex flex-col gap-3">
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
        <div className="flex gap-2">
          <Button
            isLoading={approve.isPending}
            disabled={reject.isPending}
            onClick={() =>
              approve.mutate(note.trim() || undefined, {
                onSuccess: () => {
                  addToast({ type: 'success', message: t('advisory.approved') })
                  onApproved()
                },
                onError: () => addToast({ type: 'error', message: t('advisory.approveError') }),
              })
            }
          >
            {t('advisory.approve')}
          </Button>
          <Button
            variant="danger"
            isLoading={reject.isPending}
            disabled={approve.isPending}
            onClick={() =>
              reject.mutate(note.trim() || undefined, {
                onSuccess: () => {
                  addToast({ type: 'info', message: t('advisory.rejected') })
                  onRejected()
                },
                onError: () => addToast({ type: 'error', message: t('advisory.rejectError') }),
              })
            }
          >
            {t('advisory.reject')}
          </Button>
        </div>
      </div>
    </Shake>
  )
}
