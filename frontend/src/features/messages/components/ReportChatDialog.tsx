import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useUiStore } from '@/lib/useUiStore'
import { useReportConversation } from '../hooks/useConversations'

const MAX_REASON = 500

interface ReportChatDialogProps {
  conversationId: number
  open: boolean
  onClose: () => void
}

export function ReportChatDialog({ conversationId, open, onClose }: ReportChatDialogProps) {
  const { t } = useTranslation('messages')
  const [reason, setReason] = useState('')
  const report = useReportConversation(conversationId)
  const addToast = useUiStore((state) => state.addToast)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      return
    }
    report.mutate(trimmed, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('report.sent') })
        setReason('')
        onClose()
      },
      onError: () => addToast({ type: 'error', message: t('report.error') }),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('report.title')}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-text-secondary">{t('report.intro')}</p>
        <Textarea
          label={t('report.reason')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={MAX_REASON}
          rows={4}
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('report.cancel')}
          </Button>
          <Button type="submit" variant="danger" isLoading={report.isPending} disabled={!reason.trim()}>
            {t('report.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
