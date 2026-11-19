import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function CreatorDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  return <DashboardShell title="Your creator dashboard" role="Creator">
    <div className="mt-10 grid gap-4 md:grid-cols-3">{[["My profile","Your professional profile will be built in Phase 2."],["Opportunities","Campaign discovery will be built in Phase 3."],["Collaborations","Collaboration tracking will be built in Phase 4."]].map(([t,d])=><section key={t} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{t}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{d}</p></section>)}</div>
  </DashboardShell>;
}
