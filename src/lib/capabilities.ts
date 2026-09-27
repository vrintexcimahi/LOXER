import { UserRole } from './types';

export interface RoleCapabilities {
  canApply: boolean;
  canBrowse: boolean;
  canPostJob: boolean;
  canReviewApplicants: boolean;
  canOfferServices: boolean;
  canAccessAdmin: boolean;
  canAccessGodMode: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  seeker: {
    canApply: true,
    canBrowse: true,
    canPostJob: false,
    canReviewApplicants: false,
    canOfferServices: false,
    canAccessAdmin: false,
    canAccessGodMode: false,
  },
  employer: {
    canApply: false,
    canBrowse: true,
    canPostJob: true,
    canReviewApplicants: true,
    canOfferServices: false,
    canAccessAdmin: false,
    canAccessGodMode: false,
  },
  freelancer: {
    canApply: true,
    canBrowse: true,
    canPostJob: false,
    canReviewApplicants: false,
    canOfferServices: true,
    canAccessAdmin: false,
    canAccessGodMode: false,
  },
  admin: {
    canApply: false,
    canBrowse: true,
    canPostJob: true,
    canReviewApplicants: true,
    canOfferServices: false,
    canAccessAdmin: true,
    canAccessGodMode: false,
  },
  superadmin: {
    canApply: false,
    canBrowse: true,
    canPostJob: true,
    canReviewApplicants: true,
    canOfferServices: false,
    canAccessAdmin: true,
    canAccessGodMode: true,
  },
};

export function getRoleCapabilities(role?: UserRole | null): RoleCapabilities {
  if (!role || !ROLE_CAPABILITIES[role]) {
    return {
      canApply: false,
      canBrowse: true,
      canPostJob: false,
      canReviewApplicants: false,
      canOfferServices: false,
      canAccessAdmin: false,
      canAccessGodMode: false,
    };
  }
  return ROLE_CAPABILITIES[role];
}

export function hasCapability(
  role: UserRole | null | undefined,
  capability: keyof RoleCapabilities
): boolean {
  return getRoleCapabilities(role)[capability];
}
