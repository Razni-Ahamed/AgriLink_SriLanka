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
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  nic: string
  district: string
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', request)
  return data
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register', request)
  return data
}

export async function getCurrentUser(): Promise<UserProfileResponse> {
  const { data } = await apiClient.get<UserProfileResponse>('/api/users/me')
  return data
}
