import { apiClient } from '@/lib/apiClient'
import type { Role } from '@/types/common'

export interface AuthResponse {
  token: string
  role: Role
}

/** The signed-in user's own profile, from GET /api/users/me and every /me update. */
export interface UserProfileResponse {
  userId: number
  fullName: string
  email: string
  role: Role
  nic?: string | null
  district?: string | null
  username: string
  /** Optional; show `fullName` when it is null. */
  displayName?: string | null
  /** Public https URL; null means the role's default avatar. Render it through UserAvatar. */
  profilePhotoUrl?: string | null
  /** Farmer: profile phone. Buyer: business phone. Officer/Admin: account phone, if any. */
  phoneNumber?: string | null
  /** Farmer only. */
  fieldPlotNumber?: string | null
  /** Buyer only. */
  businessName?: string | null
  /** Buyer only. */
  businessRegistrationNumber?: string | null
  /** Officer only. */
  departmentName?: string | null
  /** ISO date when the username may next change; null means it may change now. */
  usernameChangeAvailableAt?: string | null
  createdAt: string
  /** Present only for Farmer accounts — lets the UI tell the caller's own listings apart. */
  farmerProfileId?: number | null
}

/**
 * Only the fields that changed are sent: a field left out keeps its current value on the server.
 * An empty `displayName` clears it.
 */
export interface UpdateProfileRequest {
  displayName?: string
  username?: string
  /** Farmer accounts only — the server refuses it from any other role. */
  fieldPlotNumber?: string
  /** Buyer accounts only — the server refuses it from any other role. */
  businessName?: string
}

/** What the header and profile show for a user: their display name, or their full name. */
export function displayNameOf(user: Pick<UserProfileResponse, 'displayName' | 'fullName'>): string {
  return user.displayName?.trim() || user.fullName
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

export async function updateProfile(request: UpdateProfileRequest): Promise<UserProfileResponse> {
  const { data } = await apiClient.put<UserProfileResponse>('/api/users/me/profile', request)
  return data
}

/** Sent as multipart/form-data in a "photo" field. The server re-encodes it as a 512×512 JPEG. */
export async function uploadProfilePhoto(photo: Blob): Promise<UserProfileResponse> {
  const form = new FormData()
  form.append('photo', photo)
  const { data } = await apiClient.post<UserProfileResponse>('/api/users/me/photo', form)
  return data
}

export async function deleteProfilePhoto(): Promise<UserProfileResponse> {
  const { data } = await apiClient.delete<UserProfileResponse>('/api/users/me/photo')
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
