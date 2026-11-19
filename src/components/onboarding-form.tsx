"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const options = [
  { value: "BRAND", title: "I'm a brand", detail: "I want to find talent and run campaigns." },
  { value: "CREATOR", title: "I'm a creator", detail: "I create content and want brand collaborations." },
  { value: "MODEL", title: "I'm a model", detail: "I want to showcase my portfolio and find assignments." }
] as const;

export function OnboardingForm() {
  const [role, setRole] = useState<(typeof options)[number]["value"]>("BRAND");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your account type.");
      router.push(data.redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return <div className="mt-10 space-y-4">
    {options.map(option => <button type="button" key={option.value} onClick={() => setRole(option.value)} className={`block w-full rounded-2xl border p-5 text-left transition ${role === option.value ? "border-lime-300 bg-lime-300/10" : "border-white/10 bg-white/[.03] hover:border-white/30"}`}>
      <span className="font-semibold">{option.title}</span><span className="mt-1 block text-sm text-zinc-400">{option.detail}</span>
    </button>)}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button disabled={loading} onClick={submit} className="w-full rounded-full bg-lime-300 px-6 py-4 font-semibold text-black disabled:opacity-50">{loading ? "Saving..." : "Continue"}</button>
  </div>;
}
