import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) redirect("/dashboard");
  return <DashboardShell title="Platform administration" role="Admin">
    <div className="mt-10 grid gap-4 md:grid-cols-3">{[["Users","Account management will be added with admin operations."],["Verification","Talent and brand verification will be added in Phase 2."],["Platform settings","Operational settings will be added incrementally."]].map(([t,d])=><section key={t} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{t}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{d}</p></section>)}</div>
  </DashboardShell>;
}
