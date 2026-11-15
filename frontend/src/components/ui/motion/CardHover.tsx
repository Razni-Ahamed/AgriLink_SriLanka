import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { spring } from '@/lib/motion'

export function CardHover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, boxShadow: '0 22px 40px -24px rgba(4, 16, 11, 0.45)' }}
      transition={spring.move}
    >
      {children}
    </motion.div>
  )
}
