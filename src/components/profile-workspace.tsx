"use client";

import { useCallback, useEffect, useState } from "react";

type PortfolioItem = { id: string; title: string; mediaUrl: string; mediaType: string };
type SocialAccount = { id: string; platform: string; handle: string };
type ProfileData = {
  id?: string; name?: string; displayName?: string; bio?: string | null;
  city?: string | null; state?: string | null; website?: string | null;
  industry?: string | null; description?: string | null; address?: string | null;
  contactName?: string | null; contactEmail?: string | null; phone?: string | null; gstin?: string | null;
  categories?: string[]; specialties?: string[]; languages?: string[];
  portfolioItems?: PortfolioItem[]; socialAccounts?: SocialAccount[];
};
type ProfileResponse = { profile: ProfileData | null; error?: string };
type FormValues = Record<string, string>;

export function ProfileWorkspace({ type }: { type: "CREATOR" | "BRAND" }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<FormValues>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("INSTAGRAM");
  const [handle, setHandle] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/profile");
    const data = (await response.json()) as ProfileResponse;
    if (!response.ok) {
      setMessage(data.error ?? "Unable to load profile.");
      return;
    }
    const current = data.profile;
    setProfile(current);
    if (!current) return;
    setForm(type === "CREATOR" ? {
      displayName: current.displayName ?? "", bio: current.bio ?? "",
      city: current.city ?? "", state: current.state ?? "",
      categories: (current.categories ?? []).join(", "),
      specialties: (current.specialties ?? []).join(", "),
      languages: (current.languages ?? []).join(", "),
    } : {
      name: current.name ?? "", website: current.website ?? "",
      industry: current.industry ?? "", description: current.description ?? "",
      city: current.city ?? "", state: current.state ?? "",
      address: current.address ?? "", contactName: current.contactName ?? "",
      contactEmail: current.contactEmail ?? "", phone: current.phone ?? "", gstin: current.gstin ?? "",
    });
  }, [type]);

  useEffect(() => { void load(); }, [load]);

  const updateField = (key: string, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const input = (key: string, label: string) => (
    <label key={key} className="block text-sm text-zinc-400">
      {label}
      <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
        value={form[key] ?? ""} onChange={(event) => updateField(key, event.target.value)} />
    </label>
  );

  async function save() {
    setBusy(true); setMessage("");
    const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const body = type === "CREATOR" ? {
      ...form, categories: split(form.categories ?? ""),
      specialties: split(form.specialties ?? ""), languages: split(form.languages ?? ""),
    } : form;
    try {
      const response = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Save failed.");
      setMessage("Profile saved."); await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally { setBusy(false); }
  }

  async function addPortfolio() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mediaUrl: url, mediaType: "IMAGE" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to add portfolio item.");
      setTitle(""); setUrl(""); setMessage("Portfolio item added."); await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add portfolio item.");
    } finally { setBusy(false); }
  }

  async function addSocial() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/social-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle, profileUrl: url }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save social account.");
      setHandle(""); setUrl(""); setMessage("Social account saved."); await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save social account.");
    } finally { setBusy(false); }
  }

  async function requestVerification() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/verification", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit verification request.");
      setMessage("Verification request submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit verification request.");
    } finally { setBusy(false); }
  }

  const panel = "rounded-2xl border border-white/10 bg-white/[.03] p-5";
  if (!profile) return <p className="mt-8 text-sm text-zinc-400">{message || "Loading profile…"}</p>;

  return (
    <div className="mt-8 space-y-6">
      <section className={panel}>
        <h2 className="mb-5 text-lg font-semibold">Profile details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {type === "CREATOR" ? <>
            {input("displayName", "Display name")}{input("city", "City")}{input("state", "State")}
            {input("bio", "Bio")}{input("categories", "Categories (comma separated)")}
            {input("specialties", "Specialties (comma separated)")}{input("languages", "Languages (comma separated)")}
          </> : <>
            {input("name", "Brand name")}{input("website", "Website")}{input("industry", "Industry")}
            {input("description", "Description")}{input("city", "City")}{input("state", "State")}
            {input("address", "Address")}{input("contactName", "Contact name")}
            {input("contactEmail", "Contact email")}{input("phone", "Phone")}{input("gstin", "GSTIN")}
          </>}
        </div>
        <button disabled={busy} onClick={save} className="mt-5 rounded-full bg-lime-300 px-6 py-3 text-sm font-semibold text-black">Save profile</button>
      </section>
      {type === "CREATOR" && <>
        <section className={panel}>
          <h2 className="font-semibold">Portfolio</h2>
          <p className="mt-1 text-xs text-zinc-400">Provide a hosted media URL. Direct uploads are not enabled yet.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-xl bg-white/5 p-3" placeholder="Project title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input className="rounded-xl bg-white/5 p-3" placeholder="Public media URL" value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <button disabled={busy} onClick={addPortfolio} className="mt-3 rounded-full border border-white/20 px-5 py-2 text-sm">Add item</button>
          <ul className="mt-4 space-y-2">{(profile.portfolioItems ?? []).map((item) => (
            <li key={item.id} className="flex justify-between rounded-lg border border-white/10 p-3 text-sm">
              {item.title}<a href={item.mediaUrl} target="_blank" rel="noreferrer" className="text-lime-300">Open</a>
            </li>
          ))}</ul>
        </section>
        <section className={panel}>
          <h2 className="font-semibold">Social accounts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="rounded-xl bg-zinc-900 p-3" value={platform} onChange={(event) => setPlatform(event.target.value)}>
              {["INSTAGRAM", "YOUTUBE", "TIKTOK", "FACEBOOK", "X", "LINKEDIN", "TWITCH", "OTHER"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <input className="rounded-xl bg-white/5 p-3" placeholder="@handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
            <input className="rounded-xl bg-white/5 p-3" placeholder="Profile URL" value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <button onClick={addSocial} disabled={busy} className="mt-3 rounded-full border border-white/20 px-5 py-2 text-sm">Save account</button>
          <ul className="mt-4 space-y-2">{(profile.socialAccounts ?? []).map((account) => (
            <li key={account.id} className="rounded-lg border border-white/10 p-3 text-sm">{account.platform} · {account.handle}</li>
          ))}</ul>
        </section>
      </>}
      <section className={panel}>
        <h2 className="font-semibold">Verification</h2>
        <p className="mt-2 text-sm text-zinc-400">Submit your profile for manual review. Do not upload passwords or payment details.</p>
        <button disabled={busy} onClick={requestVerification} className="mt-3 rounded-full border border-lime-300/40 px-5 py-2 text-sm text-lime-200">Request verification</button>
      </section>
      {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
