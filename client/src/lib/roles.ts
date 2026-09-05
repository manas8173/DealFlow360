/**
 * Canonical role string constants for the frontend.
 * Use these everywhere instead of raw string literals.
 */
export const Role = {
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  FINANCE_OPERATIONS: 'FINANCE_OPERATIONS',
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
