import type { UserRole } from './roles';

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string | null;
  consentAcceptedAt: string | null;
}
