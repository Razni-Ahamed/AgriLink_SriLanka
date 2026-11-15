import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import i18n from '@/i18n/config'
import enCommon from '@/i18n/locales/en/common.json'
import siCommon from '@/i18n/locales/si/common.json'
import taCommon from '@/i18n/locales/ta/common.json'
import { useDistrictLabel } from './useDistrictLabel'

describe('useDistrictLabel', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('returns the English name the API uses, in English', () => {
    const { result } = renderHook(() => useDistrictLabel())
    expect(result.current('Kandy')).toBe('Kandy')
    expect(result.current('Nuwara Eliya')).toBe('Nuwara Eliya')
  })

  it('leaves a name it does not know unchanged', () => {
    const { result } = renderHook(() => useDistrictLabel())
    expect(result.current('Atlantis')).toBe('Atlantis')
  })

  it('has all 25 districts in every language, each one translated', () => {
    const keys = Object.keys(enCommon.districts)
    expect(keys).toHaveLength(25)
    for (const translated of [siCommon.districts, taCommon.districts]) {
      expect(Object.keys(translated).sort()).toEqual([...keys].sort())
      for (const key of keys as Array<keyof typeof enCommon.districts>) {
        expect(translated[key]).not.toBe(enCommon.districts[key])
      }
    }
  })
})
