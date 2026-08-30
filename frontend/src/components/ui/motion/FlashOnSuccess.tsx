import type { ReactNode } from 'react'
import { motion } from 'motion/react'

interface FlashOnSuccessProps {
  children: ReactNode
  trigger: boolean
  className?: string
}

/** Spring "pop" + brief color flash whenever `trigger` flips to a new truthy value (e.g. on mutation success). */
export function FlashOnSuccess({ children, trigger, className }: FlashOnSuccessProps) {
  return (
    <motion.div
      className={className}
      animate={
        trigger
          ? {
              scale: [1, 1.04, 1],
              backgroundColor: [
                'rgba(62, 122, 79, 0)',
                'rgba(62, 122, 79, 0.15)',
                'rgba(62, 122, 79, 0)',
              ],
            }
          : { scale: 1 }
      }
      transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  )
}
