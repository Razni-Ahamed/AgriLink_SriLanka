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
                addToast({ type: 'success', message: 'Advisory approved.' })
                onApproved()
              },
              onError: () =>
                addToast({ type: 'error', message: 'Could not approve the advisory.' }),
            })
          }
        >
          Approve
        </Button>
        <Button
          variant="danger"
          isLoading={reject.isPending}
          disabled={approve.isPending}
          onClick={() =>
            reject.mutate(undefined, {
              onSuccess: () => {
                addToast({ type: 'info', message: 'Advisory rejected.' })
                onRejected()
              },
              onError: () =>
                addToast({ type: 'error', message: 'Could not reject the advisory.' }),
            })
          }
        >
          Reject
        </Button>
      </div>
    </Shake>
  )
}
