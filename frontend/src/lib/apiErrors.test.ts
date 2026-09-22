import { beforeEach, describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { parseApiError } from './apiErrors'

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed', String(status))
  error.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

function networkError(): AxiosError {
  const error = new AxiosError('Network Error')
  error.request = {}
  return error
}

describe('parseApiError', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows a { message } response as a general error', () => {
    const error = axiosErrorWithResponse(400, { message: 'District must be one of Sri Lanka\'s 25 administrative districts.' })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(["District must be one of Sri Lanka's 25 administrative districts."])
    expect(result.fieldErrors).toEqual({})
  })

  it('maps Identity errors[] codes to the matching password-rule messages', () => {
    const error = axiosErrorWithResponse(400, {
      errors: [
        { code: 'PasswordTooShort', description: 'Passwords must be at least 12 characters.' },
        { code: 'PasswordRequiresNonAlphanumeric', description: 'Passwords must have a non-alphanumeric character.' },
      ],
    })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual([
      'Password must be at least 12 characters',
      'Password must include a symbol',
    ])
  })

  it('maps the DuplicateEmail code to the account-exists message', () => {
    const error = axiosErrorWithResponse(400, {
      errors: [{ code: 'DuplicateEmail', description: "Email 'x@y.com' is already taken." }],
    })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(['An account with this email already exists.'])
  })

  it('maps the DuplicateUserName code to the username-taken message, not the email one', () => {
    const error = axiosErrorWithResponse(400, {
      errors: [{ code: 'DuplicateUserName', description: "Username 'nimal' is already taken." }],
    })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(['That username is taken.'])
  })

  it('tells a 409 username clash apart from a 409 email clash by its code', () => {
    const error = axiosErrorWithResponse(409, {
      errors: [{ code: 'DuplicateUserName', description: 'That username is taken.' }],
    })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(['That username is taken.'])
  })

  it('falls back to the raw description for an unmapped Identity code', () => {
    const error = axiosErrorWithResponse(400, {
      errors: [{ code: 'SomeNewIdentityCode', description: 'Something Identity added later.' }],
    })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(['Something Identity added later.'])
  })

  it('maps ValidationProblemDetails field errors to this form\'s field names', () => {
    const error = axiosErrorWithResponse(400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        Email: ['The Email field is not a valid e-mail address.'],
        NIC: ['NIC must be 12 digits, or 9 digits followed by V or X.'],
      },
    })
    const result = parseApiError(error, i18n.t)
    expect(result.fieldErrors).toEqual({
      email: 'The Email field is not a valid e-mail address.',
      nic: 'NIC must be 12 digits, or 9 digits followed by V or X.',
    })
    expect(result.generalErrors).toEqual([])
  })

  it('treats a 409 as an account-already-exists conflict', () => {
    const error = axiosErrorWithResponse(409, { message: 'An account with this email already exists.' })
    const result = parseApiError(error, i18n.t)
    expect(result.generalErrors).toEqual(['An account with this email already exists.'])
  })

  it('reports a network failure distinctly from a server error', () => {
    const result = parseApiError(networkError(), i18n.t)
    expect(result.generalErrors).toEqual(["Can't reach the server. Check your connection and try again."])
  })

  it('falls back to the generic message for a non-axios error', () => {
    const result = parseApiError(new Error('boom'), i18n.t)
    expect(result.generalErrors).toEqual(['Could not create your account. Please try again.'])
  })

  it('accepts overrides for the generic/network/conflict message keys', () => {
    const error = axiosErrorWithResponse(409, { message: 'conflict' })
    const result = parseApiError(error, i18n.t, { conflictKey: 'orders:admin.createUserError' })
    expect(result.generalErrors).toEqual([i18n.t('orders:admin.createUserError')])
  })
})
