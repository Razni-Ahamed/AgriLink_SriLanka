import { describe, expect, it } from 'vitest'
import { describeChange, sentenceCase } from './auditFormat'

const labels = { yes: 'Yes', no: 'No' }

describe('sentenceCase', () => {
  it('splits the names the audit log stores into words', () => {
    expect(sentenceCase('RegistrationApproved')).toBe('Registration approved')
    expect(sentenceCase('ProfileUpdatedByAdmin')).toBe('Profile updated by admin')
    expect(sentenceCase('phoneNumber')).toBe('Phone number')
    expect(sentenceCase('User')).toBe('User')
  })
})

describe('describeChange', () => {
  it('gives one line per field when both sides are JSON objects', () => {
    expect(
      describeChange('{"phoneNumber":"0712223334"}', '{"phoneNumber":"0715558888"}', labels),
    ).toEqual([{ field: 'Phone number', from: '0712223334', to: '0715558888' }])
  })

  it('shows an empty JSON value as missing', () => {
    expect(describeChange('{"displayName":null}', '{"displayName":"Kamal P."}', labels)).toEqual([
      { field: 'Display name', from: null, to: 'Kamal P.' },
    ])
  })

  it('keeps plain values as one line', () => {
    expect(describeChange('Pending', 'Approved', labels)).toEqual([
      { field: null, from: 'Pending', to: 'Approved' },
    ])
  })

  it('writes booleans as words', () => {
    expect(describeChange('False', 'True', labels)).toEqual([
      { field: null, from: 'No', to: 'Yes' },
    ])
  })

  it('shortens a photo address to its file name', () => {
    expect(
      describeChange(
        null,
        'http://localhost:5266/api/profile-photos/29bbfc09021449f49242cf33f424cc74.jpg',
        labels,
      ),
    ).toEqual([{ field: null, from: null, to: '29bbfc09….jpg' }])
  })

  it('returns no lines when nothing was recorded', () => {
    expect(describeChange(null, null, labels)).toEqual([])
    expect(describeChange('', null, labels)).toEqual([])
  })

  it('does not break on text that only looks like JSON', () => {
    expect(describeChange('{not json', 'ok', labels)).toEqual([
      { field: null, from: '{not json', to: 'ok' },
    ])
  })
})

describe('sentenceCase with acronyms', () => {
  it('keeps an acronym in capitals and splits it from the next word', () => {
    expect(sentenceCase('AIAdvisory')).toBe('AI advisory')
    expect(sentenceCase('nicNumber')).toBe('Nic number')
    expect(sentenceCase('RegistrationApproved')).toBe('Registration approved')
  })
})
