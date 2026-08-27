import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from './authStore'
import { register as registerRequest } from './api'

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nic: z.string().min(1, 'NIC is required'),
  district: z.string().min(1, 'District is required'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.login)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      setSession(data.token, data.role)
      navigate('/', { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-sm">
          <h1 className="mb-1 font-display text-2xl text-brand-forest">Create your account</h1>
          <p className="mb-6 text-sm text-text-secondary">Registers you as a Farmer</p>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <Input
              label="Full name"
              error={errors.fullName?.message}
              {...registerField('fullName')}
            />
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              {...registerField('email')}
            />
            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...registerField('password')}
            />
            <Input label="NIC" error={errors.nic?.message} {...registerField('nic')} />
            <Input
              label="District"
              error={errors.district?.message}
              {...registerField('district')}
            />
            {mutation.isError && (
              <p className="text-sm text-state-danger">
                Could not create account. Try a different email.
              </p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating account…' : 'Register'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <a href="/login" className="text-brand-forest hover:underline">
              Sign in
            </a>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
