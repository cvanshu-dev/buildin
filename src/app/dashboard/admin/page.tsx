import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaffRole } from "@/lib/roles";
import { AdminDashboard } from "@/components/admin-dashboard";
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/dashboard");
  return <AdminDashboard role={user.role} name={user.name} />;
}
