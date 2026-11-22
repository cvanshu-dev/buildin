import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/current-user";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "PENDING" ? "/onboarding" : "/dashboard");
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900"><div className="w-full max-w-md"><Link href="/" className="text-sm font-semibold tracking-tight"><span className="text-blue-700">b.</span> buildin</Link><div className="mt-10 rounded-3xl border border-slate-200 bg-white p-7 sm:p-9"><p className="text-xs uppercase tracking-[.2em] text-blue-700">Create your account</p><h1 className="mt-3 text-3xl font-semibold">Create your Buildin account.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Start as a brand, creator or model. You can complete your profile after signup.</p><AuthForm mode="sign-up" /></div></div></main>;
}
