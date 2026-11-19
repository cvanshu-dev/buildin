import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

export default async function CreatorDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.onboardingDone) redirect("/dashboard");
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/onboarding");

  return <DashboardShell title={profile.displayName || "Creator workspace"} role="Creator">
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-zinc-400">Welcome back, {user.name}. Your creator account is ready.</p><p className="mt-1 text-xs text-zinc-500">{[profile.city, profile.state].filter(Boolean).join(", ")}</p></div>
      <Link href="/for-creators" className="rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black">Explore creator services</Link>
    </div>
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6">
      <p className="text-xs uppercase tracking-[.18em] text-lime-300">Your specialties</p>
      <div className="mt-4 flex flex-wrap gap-2">{profile.specialties.length ? profile.specialties.map(item=><span key={item} className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300">{item}</span>) : <span className="text-sm text-zinc-500">No specialties selected yet.</span>}</div>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {[["Profile & portfolio","Your profile is saved. Portfolio uploads and social verification arrive in Phase 2."],["Opportunities","Campaign discovery and applications arrive in Phase 3."],["Collaborations","Deliverables, agreements and messaging arrive in Phase 4."]].map(([title,description])=><section key={title} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p></section>)}
    </div>
  </DashboardShell>;
}