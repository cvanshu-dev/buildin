"use client";

import { useState } from "react";

type Snapshot = {
  followers: number | null; followingCount: number | null; averageLikes: number | null;
  averageComments: number | null; averageViews: number | null; engagementRate: number | null;
  postsAnalyzed: number; source: string; recordedAt: string; recentPosts?: unknown;
};
type Props = { accountId: string; initial: Snapshot | null; canRefresh?: boolean; compact?: boolean };
const fmt = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("en-IN");
export function InstagramAnalytics({ accountId, initial, canRefresh = false, compact = false }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/social-accounts/${accountId}/analytics`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh analytics.");
      setSnapshot(data.snapshot);
    } catch (e) { setError(e instanceof Error ? e.message : "Refresh failed."); }
    finally { setLoading(false); }
  }
  const stats = [
    ["Followers", fmt(snapshot?.followers)],
    ["Following", fmt(snapshot?.followingCount)],
    ["Avg. likes", fmt(snapshot?.averageLikes)],
    ["Avg. comments", fmt(snapshot?.averageComments)],
    ["Avg. Reel views", fmt(snapshot?.averageViews)],
    ["Engagement", snapshot?.engagementRate == null ? "—" : `${snapshot.engagementRate}%`],
  ];
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Instagram performance</h3><p className="mt-1 text-xs text-slate-500">Publicly collected metrics · not private Instagram Insights</p></div>
      {canRefresh && <button type="button" onClick={refresh} disabled={loading} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50">{loading ? "Analyzing…" : snapshot ? "Refresh analytics" : "Analyze account"}</button>}
    </div>
    <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
      {stats.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}
    </div>
    {snapshot ? <p className="mt-3 text-[11px] text-slate-500">Based on {snapshot.postsAnalyzed} recent posts · Updated {new Date(snapshot.recordedAt).toLocaleString("en-IN")} · {snapshot.source === "APIFY_PUBLIC_DATA" ? "Public data provider" : snapshot.source}</p> : <p className="mt-3 text-xs text-slate-500">No analytics collected yet. {canRefresh ? "Run an analysis to collect available public metrics." : "Metrics will appear after the creator or admin runs an analysis."}</p>}
    {snapshot && Array.isArray(snapshot.recentPosts) && snapshot.recentPosts.length > 0 && <div className="mt-4 border-t border-slate-200 pt-3"><h4 className="mb-2 text-xs font-semibold text-slate-700">Recent public posts</h4><div className="space-y-2">{(snapshot.recentPosts as Array<{url:string|null;type:string|null;caption:string|null;likes:number|null;comments:number|null;views:number|null;publishedAt:string|null}>).slice(0,5).map((post,index)=><div key={post.url ?? index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><div className="min-w-0 flex-1">{post.url ? <a href={post.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline">{post.type ?? "Instagram post"} · Open post</a> : <span className="font-medium">{post.type ?? "Instagram post"}</span>}{post.caption && <p className="mt-1 truncate text-slate-500">{post.caption}</p>}</div><div className="flex gap-3 text-slate-600"><span>♥ {fmt(post.likes)}</span><span>Comments {fmt(post.comments)}</span>{post.views != null && <span>Views {fmt(post.views)}</span>}</div></div>)}</div></div>}
    {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
  </section>;
}
