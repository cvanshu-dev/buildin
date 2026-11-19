export const USER_ROLES = {
  PENDING: "PENDING",
  BRAND: "BRAND",
  CREATOR: "CREATOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  CAMPAIGN_MANAGER: "CAMPAIGN_MANAGER",
  FINANCE_MANAGER: "FINANCE_MANAGER",
} as const;

export const accountTypes = ["BRAND", "CREATOR"] as const;
export type AccountType = (typeof accountTypes)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && accountTypes.includes(value as AccountType);
}

export function dashboardForRole(role: string) {
  switch (role) {
    case "BRAND": return "/dashboard/brand";
    case "CREATOR": return "/dashboard/creator";
    case "ADMIN":
    case "SUPER_ADMIN":
    case "CAMPAIGN_MANAGER":
    case "FINANCE_MANAGER": return "/dashboard/admin";
    default: return "/onboarding";
  }
}