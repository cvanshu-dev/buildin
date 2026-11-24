"use client";

import { useCallback, useEffect, useState } from "react";

// API responses are heterogeneous across dispute and report records.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const pretty = (s: string) => s.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, x => x.toUpperCase());
const input = "w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/35";

export function AdminTrustDashboard() {
  const [disputes, setDisputes] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/trust", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load trust operations.");
    setDisputes(data.disputes || []);
    setReports(data.reports || []);
    setReviewStats(data.reviewStats || {});
  }, []);

  useEffect(() => { void load().catch(error => setMessage(error instanceof Error ? error.message : "Could not load trust operations.")); }, [load]);

  async function act(body: Row, success: string) {
    setBusy(body.id); setMessage("");
    try {
      const response = await fetch("/api/admin/trust", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Moderation action failed.");
      setMessage(success);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(""); }
  }

  const activeDisputes = disputes.filter(x => ["OPEN", "UNDER_REVIEW"].includes(x.status));
  const pendingReports = reports.filter(x => x.status === "PENDING");

  return <main className="mx-auto max-w-7xl px-4 py-10 text-white sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Platform operations</p><h1 className="mt-2 text-3xl font-semibold">Trust & disputes</h1><p className="mt-2 text-sm text-white/55">Review reports, resolve collaboration disputes and moderate published feedback.</p></div><button onClick={() => void load()} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Refresh</button></div>
    {message && <p role="status" className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-sm text-cyan-100">{message}</p>}
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{[["Open disputes",activeDisputes.length],["Pending review reports",pendingReports.length],["Published reviews",reviewStats.PUBLISHED || 0]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-sm text-white/50">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</div>

    <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Collaboration disputes</h2><span className="text-xs text-white/45">{disputes.length} records · latest 100</span></div>
      <div className="space-y-4">{disputes.length ? disputes.map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-xs text-white/45">{item.collaboration.campaign.brand.name} · {item.collaboration.campaign.title} · Creator: {item.collaboration.creatorProfile.displayName || item.collaboration.creatorProfile.user.name}</p><p className="mt-1 text-xs text-cyan-200/70">{pretty(item.category)} · opened by {item.openedBy.name} ({pretty(item.openedBy.role)}) · {new Date(item.createdAt).toLocaleString("en-IN")}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{pretty(item.status)}</span></div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/70">{item.description}</p>
        {item.evidence?.length>0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{item.evidence.map((ev:Row)=><div key={ev.id} className="rounded-xl bg-black/20 p-3 text-sm"><p className="font-medium">{ev.label} <span className="text-xs text-white/35">· {pretty(ev.kind)}</span></p>{ev.content && <p className="mt-1 whitespace-pre-wrap text-white/60">{ev.content}</p>}{ev.url && <a href={ev.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-cyan-200 underline">Open evidence</a>}<p className="mt-1 text-xs text-white/35">Submitted by {ev.submittedBy.name}</p></div>)}</div>}
        {item.resolutionNote && <p className="mt-3 rounded-xl bg-emerald-300/5 p-3 text-sm text-emerald-100">Decision: {item.resolutionNote}</p>}
        {["OPEN","UNDER_REVIEW"].includes(item.status) && <div className="mt-4 space-y-3 border-t border-white/10 pt-4"><textarea className={input} rows={2} value={notes[item.id] || ""} onChange={e=>setNotes(old=>({...old,[item.id]:e.target.value}))} placeholder="Required resolution note for resolve/reject"/>
          <div className="flex flex-wrap gap-2">{item.status==="OPEN" && <button disabled={busy===item.id} onClick={()=>void act({entity:"DISPUTE",id:item.id,action:"UNDER_REVIEW"},"Dispute moved under review.")} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Start review</button>}<button disabled={busy===item.id || !(notes[item.id]||"").trim()} onClick={()=>void act({entity:"DISPUTE",id:item.id,action:"RESOLVE",resolutionNote:notes[item.id]},"Dispute resolved.")} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950">Resolve</button><button disabled={busy===item.id || !(notes[item.id]||"").trim()} onClick={()=>void act({entity:"DISPUTE",id:item.id,action:"REJECT",resolutionNote:notes[item.id]},"Dispute rejected.")} className="rounded-lg border border-red-300/30 px-3 py-2 text-xs text-red-200">Reject</button></div></div>}
        {["RESOLVED","REJECTED"].includes(item.status) && <button disabled={busy===item.id} onClick={()=>void act({entity:"DISPUTE",id:item.id,action:"REOPEN"},"Dispute reopened.")} className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-xs">Reopen dispute</button>}
      </article>) : <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No disputes have been opened.</p>}</div>
    </section>

    <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Review reports</h2><span className="text-xs text-white/45">{pendingReports.length} pending</span></div>
      <div className="space-y-4">{reports.length ? reports.map(report=><article key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{pretty(report.reason)}</h3><p className="mt-1 text-xs text-white/45">Reported by {report.reporter.name} · {new Date(report.createdAt).toLocaleString("en-IN")}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{pretty(report.status)}</span></div>
        {report.details && <p className="mt-3 text-sm text-white/60">{report.details}</p>}
        <div className="mt-3 rounded-xl bg-black/20 p-4"><p className="text-xs text-white/45">Review by {report.review.reviewer.name} ({pretty(report.review.reviewer.role)}) · {report.review.collaboration.campaign.title}</p><p className="mt-1 text-amber-300">{"★".repeat(report.review.rating)}<span className="text-white/20">{"★".repeat(5-report.review.rating)}</span></p><p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{report.review.comment}</p><p className="mt-2 text-xs text-white/40">Review status: {pretty(report.review.status)}</p></div>
        {report.status==="PENDING" && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy===report.id} onClick={()=>void act({entity:"REPORT",id:report.id,action:"DISMISS"},"Report dismissed.")} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Dismiss report</button><button disabled={busy===report.id} onClick={()=>void act({entity:"REPORT",id:report.id,action:"HIDE_REVIEW"},"Review hidden.")} className="rounded-lg border border-red-300/30 px-3 py-2 text-xs text-red-200">Hide review</button></div>}
        {report.review.status==="HIDDEN" && <button disabled={busy===report.id} onClick={()=>void act({entity:"REPORT",id:report.id,action:"RESTORE_REVIEW"},"Review restored.")} className="mt-3 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs text-emerald-200">Restore review</button>}
      </article>) : <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No review reports have been submitted.</p>}</div>
    </section>
  </main>;
}
