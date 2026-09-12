import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from './Select'
import { useDistricts } from '@/lib/useDistricts'

interface DistrictSelectProps {
  label?: string
  error?: string
  /** Adds a leading "all districts" option that selects `''`, for filter bars. */
  emptyOptionLabel?: string
  disabled?: boolean
  name?: string
  value?: string
  defaultValue?: string
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  onBlur?: React.FocusEventHandler<HTMLSelectElement>
}

/**
 * The single place a district is chosen. The API validates every district against Sri Lanka's
 * 25 administrative districts and stores the canonical spelling, so offering anything other
 * than this fixed list would just produce a rejected request.
 *
 * Forwards its ref so it drops into react-hook-form's `register()` exactly like `Select`.
 */
export const DistrictSelect = forwardRef<HTMLSelectElement, DistrictSelectProps>(
  ({ label, error, emptyOptionLabel, disabled, ...props }, ref) => {
    const { t } = useTranslation('common')
    const { data: districts, isLoading } = useDistricts()

    return (
      <Select
        ref={ref}
        label={label ?? t('fields.district')}
        error={error}
        disabled={disabled || isLoading}
        {...props}
      >
        <option value="" disabled={!emptyOptionLabel}>
          {isLoading ? t('actions.loading') : (emptyOptionLabel ?? t('fields.selectDistrict'))}
        </option>
        {districts?.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </Select>
    )
  },
)
DistrictSelect.displayName = 'DistrictSelect'
