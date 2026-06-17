export type UserRole = 'patient' | 'doctor';

export const USER_ROLES: readonly UserRole[] = ['patient', 'doctor'];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}
