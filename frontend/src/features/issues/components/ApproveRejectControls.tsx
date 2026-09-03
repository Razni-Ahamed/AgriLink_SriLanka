import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
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

  return (
    <Shake trigger={shakeTrigger}>
      <div className="flex gap-2">
        <Button
          isLoading={approve.isPending}
          disabled={reject.isPending}
          onClick={() =>
            approve.mutate(undefined, {
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
            reject.mutate(undefined, {
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
    </Shake>
  )
}
