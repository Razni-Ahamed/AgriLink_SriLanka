import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChatCircleDots } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import type { ButtonSize, ButtonVariant } from '@/components/ui/buttonClasses'
import { useUiStore } from '@/lib/useUiStore'
import { useStartConversation, type ChatSubject } from '../hooks/useConversations'

interface StartChatButtonProps {
  subject: ChatSubject
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Opens the chat about a purchase request or a crop issue (creating it the first time). */
export function StartChatButton({ subject, label, variant = 'secondary', size = 'sm' }: StartChatButtonProps) {
  const { t } = useTranslation('messages')
  const navigate = useNavigate()
  const start = useStartConversation()
  const addToast = useUiStore((state) => state.addToast)

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      isLoading={start.isPending}
      onClick={() =>
        start.mutate(subject, {
          onSuccess: (conversation) => navigate(`/messages/${conversation.conversationId}`),
          onError: () => addToast({ type: 'error', message: t('start.error') }),
        })
      }
    >
      {!start.isPending && <ChatCircleDots size={16} weight="duotone" />}
      {label}
    </Button>
  )
}
