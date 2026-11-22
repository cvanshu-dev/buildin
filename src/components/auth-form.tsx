"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSignUp = mode === "sign-up";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = isSignUp
        ? await signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: "/onboarding" })
        : await signIn.email({ email: email.trim(), password, callbackURL: "/dashboard" });
      if (result.error) throw new Error(result.error.message || "Authentication failed.");
      router.push(isSignUp ? "/onboarding" : "/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(""); setLoading(true);
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/onboarding" });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in is not configured yet.");
      setLoading(false);
    }
  }

  return <div className="mt-8 space-y-5">
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && <label className="block text-sm text-slate-700">Full name<input required autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-600" placeholder="Your full name" /></label>}
      <label className="block text-sm text-slate-700">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-600" placeholder="you@example.com" /></label>
      <label className="block text-sm text-slate-700">Password<input required type="password" minLength={10} maxLength={128} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-600" placeholder="At least 10 characters" /></label>
      {!isSignUp && <div className="text-right"><Link href="/forgot-password" className="text-sm text-blue-700 hover:text-blue-800">Forgot password?</Link></div>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      <button disabled={loading} className="w-full rounded-full bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{loading ? "Please wait..." : isSignUp ? "Create account" : "Log in"}</button>
    </form>
    {googleEnabled && <>
      <div className="relative flex items-center"><div className="h-px flex-1 bg-slate-100"/><span className="px-3 text-xs text-slate-500">OR</span><div className="h-px flex-1 bg-slate-100"/></div>
      <button type="button" onClick={handleGoogle} disabled={loading} className="w-full rounded-full border border-slate-200 px-6 py-3.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50">Continue with Google</button>
    </>}
    <p className="text-center text-sm text-slate-600">{isSignUp ? "Already have an account?" : "New to the platform?"} {" "}<Link className="text-blue-700 hover:text-blue-800" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Log in" : "Create an account"}</Link></p>
  </div>;
}