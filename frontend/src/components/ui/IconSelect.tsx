import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface IconSelectOption {
  value: string
  label: string
  icon?: ReactNode
  /** Secondary line under the label — e.g. which field and farm a crop sits in. */
  hint?: string
  /** Heading this option sits under; consecutive options sharing one are grouped. */
  group?: string
}

interface IconSelectProps {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
  options: IconSelectOption[]
  placeholder?: string
  disabled?: boolean
  /** Rendered as the first option and selects `''` — for "any crop type" style filters. */
  emptyOptionLabel?: string
  name?: string
  className?: string
}

/**
 * A select that can show an icon beside each option, which a native `<select>` cannot — its
 * `<option>` elements only render text. Styled to match Input/Select (same border, radius and
 * focus colour) so the two are interchangeable in a form.
 *
 * Kept to the listbox keyboard contract: Up/Down move the active option, Enter/Space commit,
 * Escape closes, Home/End jump to the ends, and typing jumps to the next matching label.
 */
export function IconSelect({
  label,
  error,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyOptionLabel,
  name,
  className,
}: IconSelectProps) {
  const [isOpen, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeaheadRef = useRef({ query: '', at: 0 })
  const listboxId = useId()

  const allOptions: IconSelectOption[] = emptyOptionLabel
    ? [{ value: '', label: emptyOptionLabel }, ...options]
    : options

  const selected = allOptions.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isOpen])

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    listRef.current?.querySelectorAll('[role="option"]')[activeIndex]?.scrollIntoView({
      block: 'nearest',
    })
  }, [isOpen, activeIndex])

  function open() {
    if (disabled) return
    const current = allOptions.findIndex((option) => option.value === value)
    setActiveIndex(current >= 0 ? current : 0)
    setOpen(true)
  }

  function commit(index: number) {
    const option = allOptions[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        open()
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        return
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, allOptions.length - 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        return
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        return
      case 'End':
        event.preventDefault()
        setActiveIndex(allOptions.length - 1)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeIndex)
        return
      case 'Tab':
        setOpen(false)
        return
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now()
      const typeahead = typeaheadRef.current
      typeahead.query = now - typeahead.at > 800 ? event.key : typeahead.query + event.key
      typeahead.at = now
      const match = allOptions.findIndex((option) =>
        option.label.toLowerCase().startsWith(typeahead.query.toLowerCase()),
      )
      if (match >= 0) setActiveIndex(match)
    }
  }

  // Which options start a new group heading, computed up front: deriving this by mutating a
  // variable inside the render loop is a reassign-after-render for React Compiler.
  const groupHeadings = allOptions.map((option, index) =>
    option.group && option.group !== allOptions[index - 1]?.group ? option.group : null,
  )

  return (
    <div className={cn('flex flex-col gap-1 text-sm', className)} ref={containerRef}>
      {label && <span className="font-medium text-text-primary">{label}</span>}

      <div className="relative">
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          disabled={disabled}
          onClick={() => (isOpen ? setOpen(false) : open())}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border border-text-secondary/25 bg-bg-canvas px-3 py-2 text-left text-text-primary outline-none transition-colors',
            'focus:border-brand-forest disabled:cursor-not-allowed disabled:opacity-60',
            isOpen && 'border-brand-forest',
            error && 'border-state-danger',
          )}
        >
          {selected?.icon && <span className="shrink-0 text-brand-forest">{selected.icon}</span>}
          <span className={cn('flex-1 truncate', !selected && 'text-text-secondary')}>
            {selected?.label ?? placeholder ?? ''}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className={cn(
              'shrink-0 text-text-secondary transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={label}
              initial={{ opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.985, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-brand-forest/10 bg-bg-surface/95 p-1 shadow-lg backdrop-blur-md"
            >
              {allOptions.map((option, index) => {
                const isSelected = option.value === value
                const isActive = index === activeIndex
                const groupHeading = groupHeadings[index]

                return (
                  <li key={option.value || '__empty'}>
                    {groupHeading && (
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary/70">
                        {groupHeading}
                      </p>
                    )}
                    <div
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2',
                        isActive && 'bg-brand-forest/10',
                        isSelected && 'text-brand-forest',
                      )}
                    >
                      {option.icon && (
                        <span className="shrink-0 text-brand-forest">{option.icon}</span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn('truncate', isSelected && 'font-medium')}>
                          {option.label}
                        </span>
                        {option.hint && (
                          <span className="truncate text-xs text-text-secondary">
                            {option.hint}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check size={14} weight="bold" className="shrink-0 text-brand-forest" />
                      )}
                    </div>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Mirrors the choice into normal form data, so the control still posts like a select. */}
      {name && <input type="hidden" name={name} value={value} />}

      {error && <span className="text-state-danger">{error}</span>}
    </div>
  )
}
