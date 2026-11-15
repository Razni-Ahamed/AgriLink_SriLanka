import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { scenes, type Scene } from '@/lib/scenes'

/**
 * The sign-in and registration screens: a Sri Lankan field photo fills the window (settling with a
 * slow zoom), darkened so the glass card floating on it stays readable in either theme.
 */
export function AuthScene({ photo, children }: { photo: Scene; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center px-4 py-10">
      <motion.img
        src={scenes[photo]}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 -z-20 size-full object-cover"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_50%,rgb(4_16_11/0.35),rgb(4_16_11/0.75))]"
      />
      {children}
    </div>
  )
}
