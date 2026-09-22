import { apiClient } from '@/lib/apiClient'
import type { Role } from '@/types/common'

export interface AuthResponse {
  token: string
  role: Role
}

export interface UserProfileResponse {
  userId: number
  fullName: string
  email: string
  role: Role
  nic?: string
  district?: string
  /** Present only for Farmer accounts — lets the UI tell the caller's own listings apart. */
  farmerProfileId?: number
}

export interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequestBase {
  fullName: string
  email: string
  username: string
  password: string
  nic: string
  district: string
}

export interface FarmerRegisterRequest extends RegisterRequestBase {
  role: 'Farmer'
  fieldPlotNumber: string
  phoneNumber: string
}

export interface BuyerRegisterRequest extends RegisterRequestBase {
  role: 'Buyer'
  businessRegistrationNumber: string
  businessPhone: string
  legalBusinessName: string
}

export type RegisterRequest = FarmerRegisterRequest | BuyerRegisterRequest

export interface RegisterResponse {
  message: string
  status: 'Pending'
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', request)
  return data
}

/**
 * Admin console entry point. The backend rejects non-Admin accounts here with
 * a 403, so a valid Farmer/Buyer credential can never open the admin UI.
 */
export async function adminLogin(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/admin/login', request)
  return data
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/register', request)
  return data
}

export type UsernameUnavailableReason = 'invalid' | 'reserved' | 'taken'

export interface UsernameAvailabilityResponse {
  available: boolean
  reason?: UsernameUnavailableReason
}

/**
 * Anonymous, so the registration form can use it. Signed in, the caller's own username counts as
 * available. The username travels as an axios param so it is always URL-encoded.
 */
export async function checkUsernameAvailable(
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailabilityResponse> {
  const { data } = await apiClient.get<UsernameAvailabilityResponse>('/api/users/username-available', {
    params: { username },
    signal,
  })
  return data
}

export async function getCurrentUser(): Promise<UserProfileResponse> {
  const { data } = await apiClient.get<UserProfileResponse>('/api/users/me')
  return data
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/**
 * Self-service password change, available to every role. Returns a fresh token: changing the
 * password rotates the account's security stamp, and the backend rejects any token — including
 * the caller's own current one — whose stamp claim no longer matches on the very next request.
 */
export async function changePassword(request: ChangePasswordRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/users/me/password', request)
  return data
}
