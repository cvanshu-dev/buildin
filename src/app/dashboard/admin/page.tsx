import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { isStaffRole } from "@/lib/roles";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/dashboard");
  const sections = user.role === "SUPER_ADMIN" || user.role === "ADMIN"
    ? [["Users", "Account management and role administration."], ["Verification", "Brand and creator verification operations are planned for Phase 2."], ["Platform settings", "Operational settings and audit tooling."]]
    : user.role === "CAMPAIGN_MANAGER"
      ? [["Campaign operations", "Campaign workflows will be introduced in Phase 3."], ["Creator coordination", "Creator sourcing and collaboration tools are being developed."]]
      : [["Finance operations", "Payments, reconciliation and payout tooling will be introduced in Phase 5."]];
  return <DashboardShell title="Platform operations" role={user.role.replaceAll("_", " ")}>
    <p className="mt-6 text-sm text-zinc-400">Signed in as {user.name}. Your access is determined by your server-side staff role.</p>
    <div className="mt-10 grid gap-4 md:grid-cols-3">{sections.map(([title,description])=><section key={title} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p></section>)}</div>
  </DashboardShell>;
}