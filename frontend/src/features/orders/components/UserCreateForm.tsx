import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { CreateUserRequest } from '@/types/dto/admin'

const schema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(100),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['Officer', 'Buyer']),
    district: z.string().min(1, 'District is required').max(50),
    department: z.string().max(100).optional(),
    businessName: z.string().max(100).optional(),
  })
  .refine((values) => values.role !== 'Officer' || !!values.department, {
    message: 'Department is required for Officer accounts',
    path: ['department'],
  })
  .refine((values) => values.role !== 'Buyer' || !!values.businessName, {
    message: 'Business name is required for Buyer accounts',
    path: ['businessName'],
  })

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface UserCreateFormProps {
  isSubmitting?: boolean
  onSubmit: (values: CreateUserRequest) => void
}

export function UserCreateForm({ isSubmitting, onSubmit }: UserCreateFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'Officer' },
  })

  const role = watch('role')

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Select label="Role" error={errors.role?.message} {...register('role')}>
        <option value="Officer">Officer</option>
        <option value="Buyer">Buyer</option>
      </Select>
      <Input label="District" error={errors.district?.message} {...register('district')} />
      {role === 'Officer' && (
        <Input
          label="Department"
          error={errors.department?.message}
          {...register('department')}
        />
      )}
      {role === 'Buyer' && (
        <Input
          label="Business name"
          error={errors.businessName?.message}
          {...register('businessName')}
        />
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create User'}
      </Button>
    </form>
  )
}
