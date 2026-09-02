import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { CreateCropIssueRequest, IssueSeverity } from '@/types/dto/issues'

const severityOptions: IssueSeverity[] = ['Low', 'Medium', 'High']

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().min(1, 'Description is required').max(2000),
  severity: z.enum(['Low', 'Medium', 'High']),
})

type FormValues = z.infer<typeof schema>

interface IssueFormProps {
  cropId: number
  isSubmitting?: boolean
  onSubmit: (values: CreateCropIssueRequest) => void
}

export function IssueForm({ cropId, isSubmitting, onSubmit }: IssueFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'Medium' },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => onSubmit({ cropId, ...values }))}
    >
      <Input label="Title" error={errors.title?.message} {...register('title')} />
      <Textarea
        label="Description"
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
      <Select label="Severity" error={errors.severity?.message} {...register('severity')}>
        {severityOptions.map((severity) => (
          <option key={severity} value={severity}>
            {severity}
          </option>
        ))}
      </Select>
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? 'Reporting…' : 'Report Issue'}
      </Button>
    </form>
  )
}
