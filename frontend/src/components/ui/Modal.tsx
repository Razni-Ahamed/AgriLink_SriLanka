import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type ModalSize = 'md' | 'lg'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** `md` (the default) suits a short form; `lg` a multi-section panel like the profile. */
  size?: ModalSize
  /** Fill the whole screen below the `sm` breakpoint instead of floating as a card. */
  fullScreenOnMobile?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('inert') && element.getAttribute('aria-hidden') !== 'true',
  )
}

/**
 * A dialog that behaves like one for keyboard and screen-reader users: focus moves into it on open
 * and cannot Tab out of it, Escape closes it, focus returns to whatever opened it, and the page
 * behind stops scrolling.
 */
export function Modal({ open, onClose, title, children, size = 'md', fullScreenOnMobile = false }: ModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  // Read through a ref so a parent re-rendering with a new onClose doesn't re-run the open effect
  // (which would steal focus back to the dialog mid-typing).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      const dialog = dialogRef.current
      if (event.key !== 'Tab' || !dialog) {
        return
      }

      const focusable = focusableWithin(dialog)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm',
            fullScreenOnMobile ? 'sm:p-4' : 'p-4',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              'flex w-full flex-col overflow-hidden bg-bg-surface shadow-lg outline-none',
              sizeClasses[size],
              fullScreenOnMobile
                ? 'h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl'
                : 'max-h-[90vh] max-w-md rounded-2xl',
            )}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-4">
              <h2 id={titleId} className="font-display text-lg text-text-primary">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('actions.close')}
                className="-mr-2 rounded-lg px-2 text-2xl leading-none text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-forest"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
