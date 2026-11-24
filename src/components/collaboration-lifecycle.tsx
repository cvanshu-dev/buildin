"use client";

import { useCallback, useEffect, useState } from "react";

type Milestone = { id: string; title: string; description: string | null; dueAt: string | null; status: string; feedback: string | null; sortOrder: number };
type Event = { id: string; action: string; message: string | null; createdAt: string };
type Data = { status: string; milestones: Milestone[]; events: Event[] };

export function CollaborationLifecycle({ id, role }: { id: string; role: "BRAND" | "CREATOR" }) {
  const [data, setData] = useState<Data | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/collaborations/${id}/lifecycle`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load lifecycle.");
    setData(body);
  }, [id]);
  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : "Unable to load lifecycle.")); }, [load]);

  async function send(method: "POST" | "PATCH", payload: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/collaborations/${id}/lifecycle`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Action failed.");
      setNotice(success); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }

  if (!data) return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">{error || "Loading campaign lifecycle…"}</section>;
  const active = data.status === "ACTIVE";
  const brand = role === "BRAND";
  const approved = data.milestones.filter(m => m.status === "APPROVED").length;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Phase 9 · Campaign lifecycle</p><h2 className="mt-1 text-lg font-semibold">Milestones & progress</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{data.status.replaceAll("_", " ")}</span></div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${data.milestones.length ? (approved / data.milestones.length) * 100 : 0}%` }} /></div>
    <p className="mt-2 text-xs text-slate-500">{approved} of {data.milestones.length} milestones approved</p>
    {brand && active && <form className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void send("POST", { title, description, dueAt: dueAt ? new Date(dueAt).toISOString() : null }, "Milestone added."); setTitle(""); setDescription(""); setDueAt(""); }}>
      <h3 className="font-medium sm:col-span-2">Add milestone</h3><input required minLength={2} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Milestone title" className="rounded-lg border border-slate-300 p-3 text-sm" />
      <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="rounded-lg border border-slate-300 p-3 text-sm" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={2} placeholder="Scope / acceptance criteria" className="rounded-lg border border-slate-300 p-3 text-sm sm:col-span-2" />
      <button disabled={busy} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">Add milestone</button>
    </form>}
    <div className="mt-4 space-y-3">{data.milestones.map(m => <article key={m.id} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{m.title}</h3><span className="text-xs font-medium text-slate-600">{m.status.replaceAll("_", " ")}</span></div>
      {m.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{m.description}</p>}
      <p className="mt-2 text-xs text-slate-500">Due {m.dueAt ? new Date(m.dueAt).toLocaleDateString("en-IN") : "not set"}</p>
      {m.feedback && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Feedback: {m.feedback}</p>}
      {active && <div className="mt-3 flex flex-wrap gap-2">
        {!brand && m.status === "PENDING" && <button disabled={busy} onClick={() => void send("PATCH", { action: "START", milestoneId: m.id }, "Milestone started.")} className="rounded-full border px-3 py-2 text-xs">Start</button>}
        {!brand && ["IN_PROGRESS", "CHANGES_REQUESTED"].includes(m.status) && <button disabled={busy} onClick={() => void send("PATCH", { action: "SUBMIT", milestoneId: m.id }, "Milestone submitted for review.")} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Submit for review</button>}
        {brand && m.status === "SUBMITTED" && <><button disabled={busy} onClick={() => void send("PATCH", { action: "APPROVE", milestoneId: m.id }, "Milestone approved.")} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button><button disabled={busy} onClick={() => { const value = window.prompt("What needs to change?"); if (value?.trim()) void send("PATCH", { action: "REQUEST_CHANGES", milestoneId: m.id, feedback: value }, "Revision requested."); }} className="rounded-full border border-amber-300 px-3 py-2 text-xs">Request changes</button></>}
      </div>}
    </article>)}</div>
    {data.milestones.length === 0 && <p className="mt-4 text-sm text-slate-500">No milestones have been added yet.</p>}
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {brand && active && <button disabled={busy} onClick={() => void send("PATCH", { action: "PAUSE" }, "Collaboration put on hold.")} className="rounded-full border px-4 py-2 text-sm">Put on hold</button>}
      {brand && data.status === "ON_HOLD" && <button disabled={busy} onClick={() => void send("PATCH", { action: "RESUME" }, "Collaboration resumed.")} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Resume</button>}
      {!brand && active && <button disabled={busy} onClick={() => void send("PATCH", { action: "REQUEST_COMPLETION" }, "Completion request sent to the brand.")} className="rounded-full border px-4 py-2 text-sm">Request completion</button>}
      {brand && active && <button disabled={busy} onClick={() => { if (window.confirm("Complete this collaboration? The agreement must be executed and all work approved.")) void send("PATCH", { action: "COMPLETE" }, "Collaboration completed."); }} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Complete collaboration</button>}
      {(brand || active) && !["COMPLETED", "CANCELLED"].includes(data.status) && <button disabled={busy} onClick={() => { if (window.confirm("Cancel this collaboration? This cannot be undone.")) void send("PATCH", { action: "CANCEL", message: "Cancelled from collaboration workspace." }, "Collaboration cancelled.") }} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700">Cancel</button>}
    </div>
    <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="font-medium">Activity history</h3><div className="mt-3 space-y-2">{data.events.map(event => <div key={event.id} className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><span>{event.action.replaceAll("_", " ")}{event.message ? ` · ${event.message}` : ""}</span><time>{new Date(event.createdAt).toLocaleString("en-IN")}</time></div>)}</div>{data.events.length === 0 && <p className="mt-2 text-sm text-slate-500">No lifecycle activity yet.</p>}</div>
    {(error || notice) && <p role="status" className={`mt-4 text-sm ${error ? "text-red-700" : "text-emerald-700"}`}>{error || notice}</p>}
  </section>;
}
