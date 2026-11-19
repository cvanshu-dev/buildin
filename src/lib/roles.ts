export const accountTypes = ["BRAND", "CREATOR", "MODEL"] as const;
export type AccountType = (typeof accountTypes)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && accountTypes.includes(value as AccountType);
}

export function dashboardForRole(role: string) {
  switch (role) {
    case "BRAND": return "/dashboard/brand";
    case "CREATOR": return "/dashboard/creator";
    case "MODEL": return "/dashboard/model";
    case "ADMIN":
    case "SUPER_ADMIN": return "/dashboard/admin";
    default: return "/onboarding";
  }
}
