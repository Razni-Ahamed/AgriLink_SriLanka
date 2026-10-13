import { useTranslation } from 'react-i18next'
import { useCropLabel } from '@/lib/useCropLabel'
import { formatQuantity } from '@/lib/utils'
import type { ConversationDetail, ConversationSummary } from '@/types/dto/conversations'

/** Who the chat is with: a person, or for a farmer's advice chat the district's officers. */
export function useCounterpartLabel() {
  const { t } = useTranslation('messages')
  return (chat: Pick<ConversationSummary | ConversationDetail, 'counterpartName' | 'district'>) =>
    chat.counterpartName ?? t('list.officersOf', { district: chat.district })
}

/** "Tomato · 50 kg" for a deal chat; the issue's title for an advice chat. */
export function useChatSubjectLabel() {
  const { t } = useTranslation('messages')
  const cropLabel = useCropLabel()
  return (chat: Pick<ConversationSummary | ConversationDetail, 'kind' | 'title' | 'cropType' | 'quantity'>) =>
    chat.kind === 'Deal'
      ? chat.quantity != null
        ? t('list.dealTitle', { crop: cropLabel(chat.cropType), quantity: formatQuantity(chat.quantity) })
        : cropLabel(chat.cropType)
      : chat.title
}
