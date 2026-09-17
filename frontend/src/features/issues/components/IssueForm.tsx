import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { CreateCropIssueRequest, IssueSeverity } from '@/types/dto/issues'
import { PhotoPicker } from './PhotoPicker'

const severityOptions: IssueSeverity[] = ['Low', 'Medium', 'High']

interface IssueFormProps {
  cropId: number
  isSubmitting?: boolean
  onSubmit: (values: CreateCropIssueRequest) => void
}

export function IssueForm({ cropId, isSubmitting, onSubmit }: IssueFormProps) {
  const { t } = useTranslation(['issues', 'common'])
  const statusLabel = useStatusLabel()
  // The photo is a File, not a text field, so it lives beside react-hook-form rather than in it.
  const [photo, setPhoto] = useState<File>()
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t('issues:form.titleRequired')).max(150),
        description: z.string().min(1, t('issues:form.descriptionRequired')).max(2000),
        severity: z.enum(['Low', 'Medium', 'High']),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'Medium' },
  })

  const submittingLabel = photo ? t('issues:form.submittingWithPhoto') : t('issues:form.submitting')

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) => onSubmit({ cropId, ...values, photo }))}
    >
      <Input label={t('issues:form.title')} error={errors.title?.message} {...register('title')} />
      <Textarea
        label={t('issues:form.description')}
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
      <Select
        label={t('issues:form.severity')}
        error={errors.severity?.message}
        {...register('severity')}
      >
        {severityOptions.map((severity) => (
          <option key={severity} value={severity}>
            {statusLabel('severity', severity)}
          </option>
        ))}
      </Select>
      <PhotoPicker
        value={photo}
        onChange={setPhoto}
        onProcessingChange={setIsPreparingPhoto}
        disabled={isSubmitting}
      />
      <Button type="submit" isLoading={isSubmitting} disabled={isPreparingPhoto}>
        {isSubmitting ? submittingLabel : t('issues:form.submit')}
      </Button>
    </form>
  )
}
