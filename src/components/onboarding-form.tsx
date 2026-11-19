"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = ["Fashion", "Beauty", "Lifestyle", "Travel", "Food", "Fitness", "Technology", "Gaming", "Education", "Entertainment", "Photography", "Comedy", "UGC", "Modelling"];
const specialties = ["Influencer", "UGC creator", "Fashion modelling", "Commercial modelling", "Editorial modelling", "Fitness modelling", "Product modelling", "Photography"];

type Role = "BRAND" | "CREATOR";

export function OnboardingForm() {
  const [role, setRole] = useState<Role>("BRAND");
  const [form, setForm] = useState({
    brandName: "", website: "", industry: "", description: "", city: "", state: "", address: "",
    contactName: "", contactEmail: "", phone: "", gstin: "",
    displayName: "", bio: "", categories: [] as string[], specialties: [] as string[], languages: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function update(key: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }
  function toggle(key: "categories" | "specialties", value: string) {
    setForm(current => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const payload = role === "BRAND"
      ? { role, ...form }
      : { role, displayName: form.displayName, bio: form.bio, city: form.city, state: form.state, categories: form.categories, specialties: form.specialties, languages: form.languages.split(",").map(x => x.trim()).filter(Boolean) };

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your details.");
      router.replace(data.redirectTo); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  const field = "mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-300";
  const label = "block text-sm text-zinc-300";

  return <form onSubmit={submit} className="mt-10 space-y-6">
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-1">
      {(["BRAND", "CREATOR"] as const).map(value => <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${role === value ? "bg-lime-300 text-black" : "text-zinc-400 hover:text-white"}`}>{value === "BRAND" ? "I'm a brand" : "I'm a creator"}</button>)}
    </div>

    {role === "BRAND" ? <div className="grid gap-4 sm:grid-cols-2">
      <label className={label}>Company / brand name *<input required minLength={2} maxLength={100} value={form.brandName} onChange={e => update("brandName", e.target.value)} className={field} placeholder="Your company name"/></label>
      <label className={label}>Industry<input maxLength={80} value={form.industry} onChange={e => update("industry", e.target.value)} className={field} placeholder="Fashion, food, technology..."/></label>
      <label className={label}>Website<input type="url" value={form.website} onChange={e => update("website", e.target.value)} className={field} placeholder="https://example.com"/></label>
      <label className={label}>Contact person<input value={form.contactName} onChange={e => update("contactName", e.target.value)} className={field} placeholder="Full name"/></label>
      <label className={label}>Contact email<input type="email" value={form.contactEmail} onChange={e => update("contactEmail", e.target.value)} className={field} placeholder="name@company.com"/></label>
      <label className={label}>Phone<input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} className={field} placeholder="+91..."/></label>
      <label className={label}>City *<input required value={form.city} onChange={e => update("city", e.target.value)} className={field}/></label>
      <label className={label}>State *<input required value={form.state} onChange={e => update("state", e.target.value)} className={field}/></label>
      <label className={`${label} sm:col-span-2`}>Business address<input value={form.address} onChange={e => update("address", e.target.value)} className={field}/></label>
      <label className={label}>GSTIN (optional)<input maxLength={15} value={form.gstin} onChange={e => update("gstin", e.target.value.toUpperCase())} className={field} placeholder="15-character GSTIN"/></label>
      <label className={`${label} sm:col-span-2`}>About the brand<textarea maxLength={1000} rows={4} value={form.description} onChange={e => update("description", e.target.value)} className={field} placeholder="What does your business do?"/></label>
    </div> : <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Professional / display name *<input required minLength={2} maxLength={80} value={form.displayName} onChange={e => update("displayName", e.target.value)} className={field}/></label>
        <label className={label}>City *<input required value={form.city} onChange={e => update("city", e.target.value)} className={field}/></label>
        <label className={label}>State *<input required value={form.state} onChange={e => update("state", e.target.value)} className={field}/></label>
        <label className={label}>Languages<input value={form.languages} onChange={e => update("languages", e.target.value)} className={field} placeholder="Hindi, English (comma separated)"/></label>
      </div>
      <label className={label}>Short bio<textarea rows={4} maxLength={1000} value={form.bio} onChange={e => update("bio", e.target.value)} className={field} placeholder="Tell brands about your work and experience."/></label>
      <fieldset><legend className="mb-3 text-sm text-zinc-300">Content categories</legend><div className="flex flex-wrap gap-2">{categories.map(item => <button type="button" key={item} onClick={() => toggle("categories", item)} className={`rounded-full border px-3 py-2 text-xs transition ${form.categories.includes(item) ? "border-lime-300 bg-lime-300/10 text-lime-200" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>{item}</button>)}</div></fieldset>
      <fieldset><legend className="mb-3 text-sm text-zinc-300">Specialties (modelling is a creator specialty)</legend><div className="flex flex-wrap gap-2">{specialties.map(item => <button type="button" key={item} onClick={() => toggle("specialties", item)} className={`rounded-full border px-3 py-2 text-xs transition ${form.specialties.includes(item) ? "border-lime-300 bg-lime-300/10 text-lime-200" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>{item}</button>)}</div></fieldset>
    </div>}

    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    <button disabled={loading} className="w-full rounded-full bg-lime-300 px-6 py-4 font-semibold text-black transition hover:bg-lime-200 disabled:opacity-50">{loading ? "Saving your profile..." : "Complete setup"}</button>
    <p className="text-center text-xs text-zinc-500">You can update your profile details later. Staff access is assigned internally.</p>
  </form>;
}