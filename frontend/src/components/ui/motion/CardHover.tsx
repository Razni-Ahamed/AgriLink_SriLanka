import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export function CardHover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(38, 32, 26, 0.15)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  )
}
