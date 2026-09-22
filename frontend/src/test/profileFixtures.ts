import type { UserProfileResponse } from '@/auth/api'

/** A signed-in Farmer's profile as GET /api/users/me returns it; override what a test cares about. */
export function farmerProfile(overrides: Partial<UserProfileResponse> = {}): UserProfileResponse {
  return {
    userId: 7,
    fullName: 'Nimal Perera',
    email: 'nimal@agrilink.lk',
    role: 'Farmer',
    nic: '199912345678',
    district: 'Kandy',
    username: 'nimal.perera',
    displayName: null,
    profilePhotoUrl: null,
    phoneNumber: '0771234567',
    fieldPlotNumber: 'PLOT-42',
    businessName: null,
    businessRegistrationNumber: null,
    departmentName: null,
    usernameChangeAvailableAt: null,
    createdAt: '2026-01-15T08:00:00Z',
    farmerProfileId: 3,
    ...overrides,
  }
}
