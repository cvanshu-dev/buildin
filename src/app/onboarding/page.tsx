import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { dashboardForRole } from "@/lib/roles";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "PENDING") redirect(dashboardForRole(user.role));
  return <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white"><div className="mx-auto max-w-2xl"><p className="text-sm uppercase tracking-widest text-lime-300">Getting started</p><h1 className="mt-4 text-4xl font-semibold">Choose how you&apos;ll use the platform.</h1><p className="mt-4 text-zinc-400">You can select a brand, creator or model account. Admin access is assigned internally and cannot be selected here.</p><OnboardingForm /></div></main>;
}
