import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, SealCheck } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { FlashOnSuccess } from '@/components/ui/motion/FlashOnSuccess'
import { useAuthStore } from '@/auth/authStore'
import { AdvisoryPanel } from '../components/AdvisoryPanel'
import { ApproveRejectControls } from '../components/ApproveRejectControls'
import { useAdvisory } from '../hooks/useAdvisories'

export function AdvisoryDetailPage() {
  const { advisoryId } = useParams<{ advisoryId: string }>()
  const id = Number(advisoryId)
  const role = useAuthStore((state) => state.role)

  const { data: advisory, isLoading, isError } = useAdvisory(id)

  const [approveFlash, setApproveFlash] = useState(false)
  const [shakeTrigger, setShakeTrigger] = useState(false)
  const [justRejected, setJustRejected] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  if (isError || !advisory) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          This advisory isn't available yet — it may still be awaiting officer review.
        </p>
        <Link
          to="/issues/mine"
          className="flex w-fit items-center gap-1 text-sm text-brand-forest hover:underline"
        >
          <ArrowLeft size={14} />
          Back to my issues
        </Link>
      </div>
    )
  }

  const canReview = (role === 'Officer' || role === 'Admin') && advisory.status === 'Draft'
  const showControls = canReview || justRejected

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={role === 'Farmer' ? '/issues/mine' : '/issues/pending'}
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <div>
        <h1 className="font-display text-2xl text-text-primary">{advisory.issueTitle}</h1>
        <p className="text-sm text-text-secondary">Advisory #{advisory.advisoryId}</p>
      </div>

      {role === 'Farmer' && advisory.status === 'Approved' ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <IconBadge tone="forest">
            <SealCheck size={22} weight="duotone" />
          </IconBadge>
          <p className="font-display text-lg text-text-primary">Your advisory is ready</p>
          <AdvisoryPanel advisory={advisory} />
        </Card>
      ) : (
        <FlashOnSuccess trigger={approveFlash}>
          <Card className="flex flex-col gap-6">
            <AdvisoryPanel advisory={advisory} />

            <AnimatePresence>
              {showControls && (
                <motion.div
                  key="controls"
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ApproveRejectControls
                    advisoryId={advisory.advisoryId}
                    shakeTrigger={shakeTrigger}
                    onApproved={() => setApproveFlash((flag) => !flag)}
                    onRejected={() => {
                      setShakeTrigger((flag) => !flag)
                      setJustRejected(true)
                      setTimeout(() => setJustRejected(false), 450)
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </FlashOnSuccess>
      )}
    </div>
  )
}
