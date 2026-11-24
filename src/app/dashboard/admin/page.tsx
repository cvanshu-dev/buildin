import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { isStaffRole } from "@/lib/roles";
import { AdminDashboard } from "@/components/admin-dashboard";
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/dashboard");
  return <><div className="mx-auto mt-6 max-w-7xl px-4 sm:px-8"><Link href="/dashboard/admin/trust" className="inline-flex rounded-xl border border-cyan-300/30 bg-cyan-300/5 px-4 py-2.5 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10">Open Trust &amp; Disputes Console →</Link></div><AdminDashboard role={user.role} name={user.name} /></>;
}
