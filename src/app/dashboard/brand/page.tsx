import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function BrandDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BRAND") redirect("/dashboard");
  return <DashboardShell title="Your brand dashboard" role="Brand">
    <div className="mt-10 grid gap-4 md:grid-cols-3">{[["Campaigns","Your campaigns will appear here."],["Discover talent","Creator discovery is introduced in a later phase."],["Team","Organization team management is planned for the next iteration."]].map(([t,d])=><section key={t} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{t}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{d}</p></section>)}</div>
  </DashboardShell>;
}
