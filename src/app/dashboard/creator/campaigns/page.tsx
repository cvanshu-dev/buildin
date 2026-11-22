"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string; title: string; brief: string; categories: string[]; platforms: string[];
  location: string | null; budgetMin: number | null; budgetMax: number | null;
  applicationDeadline: string | null; startDate: string | null; endDate: string | null;
  brand: { name: string; industry: string | null; city: string | null; state?: string | null };
};
type Application = { campaign: { id: string }; status: string };
const money = (value: number | null) => value == null ? "Not specified" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export default function CreatorCampaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [pitches, setPitches] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [campaignResponse, overviewResponse] = await Promise.all([
        fetch("/api/campaigns", { cache: "no-store" }),
        fetch("/api/creator/overview", { cache: "no-store" }),
      ]);
      const [campaignData, overviewData] = await Promise.all([campaignResponse.json(), overviewResponse.json()]);
      if (!campaignResponse.ok) throw new Error(campaignData.error || "Unable to load campaigns.");
      if (!overviewResponse.ok) throw new Error(overviewData.error || "Unable to load your application history.");
      setItems(campaignData.campaigns || []);
      setApplications(overviewData.applications || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load campaigns."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const categories = useMemo(() => Array.from(new Set(items.flatMap((item) => item.categories))).sort(), [items]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTerm = !term || [item.title, item.brief, item.brand.name, item.brand.industry || "", item.location || ""].join(" ").toLowerCase().includes(term);
      return matchesTerm && (category === "ALL" || item.categories.includes(category));
    });
  }, [items, query, category]);
  const applied = useMemo(() => new Map(applications.map((application) => [application.campaign.id, application.status])), [applications]);

  async function apply(id: string) {
    setBusy(id); setError(""); setNotice("");
    const pitch = (pitches[id] || "").trim();
    const rateText = rates[id]?.trim() || "";
    if (pitch.length < 20) { setError("Your pitch must contain at least 20 characters."); setBusy(""); return; }
    if (rateText && (!/^\\d+$/.test(rateText) || Number(rateText) < 0)) { setError("Enter a valid proposed rate in INR."); setBusy(""); return; }
    try {
      const response = await fetch("/api/campaigns/" + id + "/applications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch, ...(rateText ? { proposedRate: Number(rateText) } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Application failed.");
      setApplications((current) => [{ campaign: { id }, status: "SUBMITTED" }, ...current]);
      setNotice("Application submitted successfully.");
      setPitches((current) => ({ ...current, [id]: "" }));
      setRates((current) => ({ ...current, [id]: "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Application failed."); }
    finally { setBusy(""); }
  }

  return (
    <main className="mx-auto mt-8 max-w-6xl text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><Link href="/dashboard/creator" className="text-sm text-lime-300">← Creator dashboard</Link><h1 className="mt-3 text-3xl font-semibold">Discover campaigns</h1><p className="mt-2 text-sm text-zinc-400">Find relevant brand campaigns and submit a tailored pitch.</p></div>
        <p className="text-sm text-zinc-400">{filtered.length} campaigns</p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_240px]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search campaign, brand, brief or location" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm"><option value="ALL">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>
      {(error || notice) && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-300/20 text-red-200" : "border-lime-300/20 text-lime-200"}`}>{error || notice}</p>}
      {loading ? <p className="mt-8 text-sm text-zinc-400">Loading campaigns…</p> : filtered.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center"><p className="font-medium">No matching campaigns</p><p className="mt-2 text-sm text-zinc-400">Try another search or category. New campaigns appear here when brands publish them.</p></div> : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((campaign) => {
            const status = applied.get(campaign.id);
            return <article key={campaign.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-lime-300">{campaign.brand.name}{campaign.brand.industry ? " · " + campaign.brand.industry : ""}</p><h2 className="mt-2 text-xl font-semibold">{campaign.title}</h2></div>{status && <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">{status.replaceAll("_", " ")}</span>}</div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">{campaign.brief}</p>
              <div className="mt-4 flex flex-wrap gap-2">{campaign.categories.map((item) => <span key={item} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">{item}</span>)}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-zinc-500">Budget range</p><p className="mt-1">{money(campaign.budgetMin)} – {money(campaign.budgetMax)}</p></div><div><p className="text-xs text-zinc-500">Platforms</p><p className="mt-1">{campaign.platforms.length ? campaign.platforms.join(", ") : "Flexible"}</p></div><div><p className="text-xs text-zinc-500">Location</p><p className="mt-1">{campaign.location || [campaign.brand.city, campaign.brand.state].filter(Boolean).join(", ") || "Remote"}</p></div><div><p className="text-xs text-zinc-500">Deadline</p><p className="mt-1">{campaign.applicationDeadline ? new Date(campaign.applicationDeadline).toLocaleDateString("en-IN") : "Not specified"}</p></div></div>
              {!status ? <div className="mt-5 border-t border-white/10 pt-4"><label className="block text-xs text-zinc-400">Your pitch (minimum 20 characters)<textarea rows={3} maxLength={2000} value={pitches[campaign.id] || ""} onChange={(e) => setPitches((current) => ({ ...current, [campaign.id]: e.target.value }))} placeholder="Explain why you fit this campaign and what you can deliver…" className="mt-2 w-full rounded-xl bg-white/5 p-3 text-sm text-white" /></label><label className="mt-3 block text-xs text-zinc-400">Your proposed rate in INR (optional)<input type="number" min="0" step="1" value={rates[campaign.id] || ""} onChange={(e) => setRates((current) => ({ ...current, [campaign.id]: e.target.value }))} placeholder="e.g. 5000" className="mt-2 w-full rounded-xl bg-white/5 p-3 text-sm text-white" /></label><button disabled={busy === campaign.id} onClick={() => void apply(campaign.id)} className="mt-4 rounded-full bg-lime-300 px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{busy === campaign.id ? "Submitting…" : "Submit application"}</button></div> : <p className="mt-5 border-t border-white/10 pt-4 text-sm text-zinc-400">You have already applied. Track the decision from your creator dashboard.</p>}
            </article>;
          })}
        </div>
      )}
    </main>
  );
}
