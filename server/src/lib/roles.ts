/**
 * Canonical role string constants for the entire server.
 * Use these everywhere instead of raw string literals to prevent silent typo bugs.
 */
export const Role = {
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  FINANCE_OPERATIONS: 'FINANCE_OPERATIONS',
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

/** Roles that are internal employees (not customers). */
export const INTERNAL_ROLES: RoleType[] = [
  Role.ADMIN,
  Role.SALES_REP,
  Role.SALES_MANAGER,
  Role.FINANCE_OPERATIONS,
];

/** Roles that can approve quotation steps. */
export const APPROVAL_ROLES: RoleType[] = [
  Role.SALES_MANAGER,
  Role.FINANCE_OPERATIONS,
];
