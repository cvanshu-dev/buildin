import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/current-user";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900"><div className="w-full max-w-md"><Link href="/" className="text-sm font-semibold tracking-tight"><span className="text-blue-700">b.</span> buildin</Link><div className="mt-10 rounded-3xl border border-slate-200 bg-white p-7 sm:p-9"><p className="text-xs uppercase tracking-[.2em] text-blue-700">Welcome back</p><h1 className="mt-3 text-3xl font-semibold">Log in to your account.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Access your campaigns, collaborations and workspace.</p><AuthForm mode="sign-in" /></div></div></main>;
}
