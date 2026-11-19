import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { dashboardForRole } from "@/lib/roles";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "PENDING" || user.onboardingDone) redirect(dashboardForRole(user.role));

  return <main className="min-h-screen bg-zinc-950 px-6 py-14 text-white">
    <div className="mx-auto max-w-3xl">
      <p className="text-sm uppercase tracking-[.2em] text-lime-300">Getting started · Step 1 of 1</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Let's set up your workspace.</h1>
      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Choose whether you're joining as a brand or a creator, then add the basic information needed to get started. Modelling is available as a creator specialty.</p>
      <OnboardingForm />
    </div>
  </main>;
}