import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Warning } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { FadeIn } from '@/components/ui/motion/FadeIn'
import { FlashOnSuccess } from '@/components/ui/motion/FlashOnSuccess'
import { useUiStore } from '@/lib/useUiStore'
import { IssueForm } from '../components/IssueForm'
import { useCreateIssue } from '../hooks/useIssues'

export function NewIssuePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const createIssue = useCreateIssue()
  const [submitted, setSubmitted] = useState(false)

  const cropId = searchParams.get('cropId')
  const cropType = searchParams.get('cropType')

  if (!cropId) {
    return (
      <FadeIn>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <IconBadge tone="terracotta">
            <Warning size={20} weight="duotone" />
          </IconBadge>
          <p className="text-text-primary">
            An issue has to be tied to a specific crop. Go plant or select a crop first, then
            report the issue from that crop's page.
          </p>
          <Link to="/farms" className="text-sm font-medium text-brand-forest hover:underline">
            Go to my farms
          </Link>
        </Card>
      </FadeIn>
    )
  }

  const cropIdNum = Number(cropId)

  return (
    <FadeIn>
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl text-text-primary">Report an Issue</h1>

        <FlashOnSuccess trigger={submitted}>
          <Card className="flex flex-col gap-6">
            <p className="text-sm text-text-secondary">
              Reporting an issue for{' '}
              <span className="font-medium text-text-primary">{cropType ?? 'this crop'}</span>{' '}
              (crop #{cropIdNum})
            </p>

            <IssueForm
              cropId={cropIdNum}
              isSubmitting={createIssue.isPending}
              onSubmit={(values) =>
                createIssue.mutate(values, {
                  onSuccess: () => {
                    setSubmitted(true)
                    addToast({ type: 'success', message: 'Issue reported.' })
                    setTimeout(() => navigate('/issues/mine'), 500)
                  },
                  onError: () =>
                    addToast({ type: 'error', message: 'Could not report the issue. Try again.' }),
                })
              }
            />
          </Card>
        </FlashOnSuccess>
      </div>
    </FadeIn>
  )
}
