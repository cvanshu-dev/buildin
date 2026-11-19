import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/prisma";

export default async function BrandDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BRAND" || !user.onboardingDone) redirect("/dashboard");
  const membership = await prisma.brandMember.findFirst({
    where: { userId: user.id },
    include: { brand: true },
  });
  if (!membership) redirect("/onboarding");

  const brand = membership.brand;
  return <DashboardShell title={brand.name} role="Brand">
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-zinc-400">Welcome back, {user.name}. Your brand workspace is ready.</p><p className="mt-1 text-xs text-zinc-500">{[brand.city, brand.state].filter(Boolean).join(", ")}</p></div>
      <Link href="/for-brands" className="rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black">Explore brand services</Link>
    </div>
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {[["Campaigns","Campaign creation and campaign management arrive in Phase 3."],["Discover creators","Creator search, filters and shortlists arrive in Phase 3."],["Brand profile","Your organization profile is saved and ready to expand."]].map(([title,description])=><section key={title} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p></section>)}
    </div>
  </DashboardShell>;
}