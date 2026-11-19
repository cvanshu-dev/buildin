import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/current-user";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "PENDING" ? "/onboarding" : "/dashboard");
  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white"><div className="w-full max-w-md"><Link href="/" className="text-sm font-semibold tracking-tight">MARKET<span className="text-lime-300">PLACE.</span></Link><div className="mt-10 rounded-3xl border border-white/10 bg-white/[.03] p-7 sm:p-9"><p className="text-xs uppercase tracking-[.2em] text-lime-300">Create your account</p><h1 className="mt-3 text-3xl font-semibold">Join the marketplace.</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Create your account first. You'll choose Brand or Creator and complete your profile next. Modelling is a creator specialty.</p><AuthForm mode="sign-up" /></div></div></main>;
}