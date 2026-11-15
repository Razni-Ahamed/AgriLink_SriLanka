import { useId, useState } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { Minus, Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { AnimatedCheck } from '@/components/canopy/AnimatedCheck'
import { Odometer } from '@/components/canopy/Odometer'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { PRESS_SCALE, spring } from '@/lib/motion'
import { useUnits, type QuantityUnit } from '@/lib/units'
import { cn, formatQuantity } from '@/lib/utils'

interface RequestPanelProps {
  pricePerUnit: number
  availableQuantity: number
  unit: QuantityUnit
  isSending: boolean
  isSent: boolean
  onSend: (values: { requestedQuantity: number; message?: string }) => void
}

/** Kilograms step by 5, everything counted in whole pieces, bunches or sacks by 1. */
function stepFor(unit: QuantityUnit, available: number) {
  return unit === 'Kg' ? Math.min(5, available) : 1
}

/**
 * Asking to buy, right on the listing page: pick an amount with − and +, watch the total roll to
 * the new price, add a note, send. The send button turns into a spinner and then a drawn tick.
 */
export function RequestPanel({
  pricePerUnit,
  availableQuantity,
  unit,
  isSending,
  isSent,
  onSend,
}: RequestPanelProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const units = useUnits()
  const step = stepFor(unit, availableQuantity)
  const [quantity, setQuantity] = useState(() => Math.min(step * 2, availableQuantity))
  const [message, setMessage] = useState('')
  const [quantityScope, animateQuantity] = useAnimate<HTMLInputElement>()
  const quantityId = useId()

  const valid = quantity > 0 && quantity <= availableQuantity
  const total = Math.round(quantity * pricePerUnit * 100) / 100

  /** `pop` gives the number a little bounce: for − and +, not while someone is typing. */
  function change(next: number, pop = false) {
    const clamped = Math.min(Math.max(Math.round(next * 100) / 100, 0), availableQuantity)
    setQuantity(clamped)
    if (pop && quantityScope.current) {
      void animateQuantity(quantityScope.current, { scale: [1.18, 1] }, spring.tap)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid || isSending || isSent) return
        onSend({ requestedQuantity: quantity, message: message.trim() || undefined })
      }}
    >
      <div>
        <label htmlFor={quantityId} className="mb-2 block text-sm font-medium text-text-primary">
          {t('marketplace:requestForm.quantityLabel', {
            max: units.quantity(availableQuantity, unit),
          })}
        </label>
        <div className="flex items-center justify-between gap-2 rounded-full bg-text-primary/[0.05] p-1.5">
          <StepButton
            label={t('common:actions.decrease')}
            disabled={quantity <= step || isSent}
            onClick={() => change(quantity - step, true)}
          >
            <Minus size={18} weight="bold" />
          </StepButton>
          <div className="flex min-w-0 items-baseline justify-center gap-1.5">
            <input
              ref={quantityScope}
              id={quantityId}
              type="number"
              inputMode="decimal"
              min={0}
              max={availableQuantity}
              step="any"
              value={quantity}
              disabled={isSent}
              onChange={(event) => change(Number(event.target.value))}
              className="w-20 bg-transparent text-center font-display text-2xl font-bold tabular-nums text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-text-secondary">{units.per(unit)}</span>
          </div>
          <StepButton
            label={t('common:actions.increase')}
            disabled={quantity + step > availableQuantity || isSent}
            onClick={() => change(quantity + step, true)}
          >
            <Plus size={18} weight="bold" />
          </StepButton>
        </div>
        {!valid && (
          <p className="mt-1.5 text-sm text-state-danger">
            {quantity <= 0
              ? t('common:validation.quantityMin')
              : t('common:validation.onlyAvailable', {
                  max: units.quantity(availableQuantity, unit),
                })}
          </p>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-sm text-text-secondary">{t('marketplace:detail.total')}</span>
        <span className="font-display text-3xl font-bold text-text-primary">
          Rs <Odometer value={total} format={(value) => formatQuantity(value)} />
        </span>
      </div>

      <Textarea
        label={t('common:fields.messageOptional')}
        rows={2}
        maxLength={500}
        value={message}
        disabled={isSent}
        onChange={(event) => setMessage(event.target.value)}
      />

      <motion.button
        type="submit"
        disabled={!valid || isSending || isSent}
        whileTap={{ scale: PRESS_SCALE }}
        transition={spring.tap}
        className={cn(
          'relative flex min-h-13 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-base font-semibold shadow-sm transition-colors',
          'bg-brand-forest text-bg-surface hover:bg-brand-forest-light disabled:cursor-not-allowed',
          !valid && 'opacity-50',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isSent ? 'sent' : isSending ? 'sending' : 'idle'}
            className="flex items-center gap-2"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {isSent ? (
              <>
                <AnimatedCheck className="size-5" />
                {t('marketplace:detail.sent')}
              </>
            ) : isSending ? (
              <>
                <Spinner size="sm" />
                {t('marketplace:requestForm.sending')}
              </>
            ) : (
              t('marketplace:requestForm.send')
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <p className="text-center text-xs text-text-secondary">
        {isSent ? t('marketplace:detail.requestSent') : t('marketplace:detail.requestNote')}
      </p>
    </form>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={spring.tap}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-text-primary/10 bg-bg-surface text-text-primary shadow-sm transition-opacity disabled:opacity-35"
    >
      {children}
    </motion.button>
  )
}
