import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from './authStore'
import { login } from './api'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.login)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.token, data.role)
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(redirectTo, { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-sm">
          <h1 className="mb-1 font-display text-2xl text-brand-forest">AgriLink</h1>
          <p className="mb-6 text-sm text-text-secondary">Sign in to your account</p>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            {mutation.isError && (
              <p className="text-sm text-state-danger">Invalid email or password.</p>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            No account?{' '}
            <a href="/register" className="text-brand-forest hover:underline">
              Register
            </a>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
