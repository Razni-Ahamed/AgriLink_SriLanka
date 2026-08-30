import type { ReactNode } from 'react'
import { motion } from 'motion/react'

interface ShakeProps {
  children: ReactNode
  trigger: boolean
  className?: string
}

/** Shakes once whenever `trigger` flips to a new truthy value (e.g. on a failed/declined action). */
export function Shake({ children, trigger, className }: ShakeProps) {
  return (
    <motion.div
      className={className}
      animate={trigger ? { x: [0, -8, 8, -6, 6, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}
