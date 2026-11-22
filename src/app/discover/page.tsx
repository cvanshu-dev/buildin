"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Creator = {
  id: string;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  categories: string[];
  specialties: string[];
  portfolioItems: { id: string; title: string; mediaUrl: string }[];
  socialAccounts: { platform: string; handle: string; followers: number | null }[];
};

export default function DiscoverPage() {
  const [items, setItems] = useState<Creator[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(async (next = 1) => {
    const params = new URLSearchParams({ page: String(next), q, city, category });
    const response = await fetch("/api/discovery?" + params);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to load creators");
      return;
    }
    setError("");
    setItems(data.creators);
    setPages(data.pagination.pages);
    setPage(next);
  }, [q, city, category]);

  useEffect(() => {
    void load(1);
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-blue-700">← Home</Link>
        <h1 className="mt-6 text-4xl font-semibold">Discover creators</h1>
        <p className="mt-2 text-slate-600">Search public creator profiles by name, location and category.</p>
        <form className="mt-8 grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
          <input className="rounded-xl border border-slate-200 bg-slate-50 p-3" placeholder="Name or keyword" value={q} onChange={(event) => setQ(event.target.value)} />
          <input className="rounded-xl border border-slate-200 bg-slate-50 p-3" placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} />
          <input className="rounded-xl border border-slate-200 bg-slate-50 p-3" placeholder="Category (exact)" value={category} onChange={(event) => setCategory(event.target.value)} />
          <button className="rounded-xl bg-blue-600 p-3 font-semibold text-white">Search</button>
        </form>
        {error && <p className="mt-4 text-red-300">{error}</p>}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((creator) => (
            <article key={creator.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold">{creator.displayName || "Creator"}</h2>
              <p className="mt-1 text-sm text-slate-600">{[creator.city, creator.state].filter(Boolean).join(", ")}</p>
              <p className="mt-4 line-clamp-4 text-sm text-slate-700">{creator.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {creator.categories.map((item) => <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs">{item}</span>)}
              </div>
              <p className="mt-4 text-xs text-slate-600">{creator.socialAccounts.map((social) => social.platform + " · " + (social.followers ?? "—")).join(" / ")}</p>
              <Link className="mt-5 inline-block text-sm text-blue-700" href={"/creators/" + creator.id}>View public profile →</Link>
            </article>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-4">
          <button disabled={page <= 1} onClick={() => void load(page - 1)} className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-30">Previous</button>
          <span className="text-sm text-slate-600">Page {page} of {Math.max(1, pages)}</span>
          <button disabled={page >= pages} onClick={() => void load(page + 1)} className="rounded-full border border-white/20 px-4 py-2 disabled:opacity-30">Next</button>
        </div>
      </div>
    </main>
  );
}
