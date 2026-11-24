"use client";

import { useCallback, useEffect, useState } from "react";

type Review = { id: string; rating: number; title: string | null; comment: string; createdAt: string; reviewer: { name: string; role: string } };
type Evidence = { id: string; kind: string; label: string; content: string | null; url: string | null; submittedBy: { name: string } };
type Dispute = { id: string; category: string; title: string; description: string; status: string; resolutionNote: string | null; createdAt: string; openedBy: { name: string; role: string }; evidence: Evidence[] };

const pretty = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, x => x.toUpperCase());
const field = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60";
const button = "rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50";

export function CollaborationTrustPanel({ collaborationId, collaborationStatus, role }: { collaborationId: string; collaborationStatus: string; role: "BRAND" | "CREATOR" }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ownReview, setOwnReview] = useState<{ id: string; rating: number; comment: string } | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("DELIVERABLE_QUALITY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceContent, setEvidenceContent] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [reviewRes, disputeRes] = await Promise.all([
        fetch(`/api/collaborations/${collaborationId}/reviews`, { cache: "no-store" }),
        fetch(`/api/collaborations/${collaborationId}/disputes`, { cache: "no-store" }),
      ]);
      const [reviewData, disputeData] = await Promise.all([reviewRes.json(), disputeRes.json()]);
      if (!reviewRes.ok) throw new Error(reviewData.error || "Could not load reviews.");
      if (!disputeRes.ok) throw new Error(disputeData.error || "Could not load disputes.");
      setReviews(reviewData.reviews || []);
      setOwnReview(reviewData.ownReview || null);
      setCanReview(Boolean(reviewData.canReview));
      setDisputes(disputeData.disputes || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load collaboration trust details.");
    }
  }, [collaborationId]);

  useEffect(() => { void load(); }, [load]);

  async function send(url: string, body: unknown, success: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      setMessage(success);
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
      return false;
    } finally { setBusy(false); }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await send(`/api/collaborations/${collaborationId}/reviews`, { rating, comment }, "Your review has been published.")) setComment("");
  }

  async function submitDispute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const evidence = evidenceLabel.trim() && evidenceContent.trim()
      ? [{ kind: "NOTE", label: evidenceLabel.trim(), content: evidenceContent.trim() }]
      : [];
    const ok = await send(`/api/collaborations/${collaborationId}/disputes`, { category, title, description, evidence }, "Your dispute has been submitted.");
    if (ok) { setTitle(""); setDescription(""); setEvidenceLabel(""); setEvidenceContent(""); }
  }

  return <section className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-[#111719] p-5 text-white sm:p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Trust & accountability</p><h2 className="mt-1 text-xl font-semibold">Reviews and disputes</h2><p className="mt-1 text-sm text-white/55">Reviews are available after completion. Disputes remain visible to both collaboration participants.</p></div>
    {message && <p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-sm text-cyan-100">{message}</p>}

    <div className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Collaboration reviews</h3><span className="text-xs text-white/45">{reviews.length} published</span></div>
      {reviews.length ? reviews.map(review => <article key={review.id} className="rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">{review.reviewer.name} <span className="ml-1 text-xs text-white/40">· {pretty(review.reviewer.role)}</span></div><div className="text-amber-300" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<span className="text-white/20">{"★".repeat(5-review.rating)}</span></div></div>
        {review.title && <p className="mt-2 text-sm font-semibold">{review.title}</p>}<p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/70">{review.comment}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-white/35"><time>{new Date(review.createdAt).toLocaleDateString("en-IN")}</time><button className="underline underline-offset-2 hover:text-white" onClick={() => void send(`/api/reviews/${review.id}/report`, { reason: "OTHER", details: "Reported by a collaboration participant." }, "Review reported to moderation.")}>Report review</button></div>
      </article>) : <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/45">No reviews have been published for this collaboration yet.</p>}
      {canReview && !ownReview && <form onSubmit={submitReview} className="space-y-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
        <h4 className="font-semibold">Leave your review</h4><label className="block text-xs text-white/60">Rating</label><select value={rating} onChange={e => setRating(Number(e.target.value))} className={field}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} / 5 stars</option>)}</select>
        <textarea required minLength={10} maxLength={2000} rows={3} value={comment} onChange={e => setComment(e.target.value)} className={field} placeholder="Describe your experience (at least 10 characters)"/>
        <button className={button} disabled={busy || comment.trim().length < 10}>Publish review</button>
      </form>}
      {ownReview && <p className="rounded-xl bg-white/[0.04] p-3 text-sm text-white/60">Your side has already submitted its review for this collaboration.</p>}
      {collaborationStatus !== "COMPLETED" && <p className="text-xs text-white/40">Reviews unlock when the collaboration is marked completed.</p>}
    </div>

    <div className="border-t border-white/10 pt-5">
      <div className="flex items-center justify-between"><h3 className="font-semibold">Disputes</h3><span className="text-xs text-white/45">{disputes.length} total</span></div>
      <div className="mt-3 space-y-3">{disputes.map(dispute => <article key={dispute.id} className="rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{dispute.title}</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{pretty(dispute.status)}</span></div>
        <p className="mt-1 text-xs text-cyan-200/70">{pretty(dispute.category)} · opened by {dispute.openedBy.name}</p><p className="mt-3 whitespace-pre-wrap text-sm text-white/65">{dispute.description}</p>
        {dispute.evidence.length > 0 && <div className="mt-3 space-y-2 border-t border-white/10 pt-3"><p className="text-xs font-semibold text-white/50">Evidence</p>{dispute.evidence.map(item => <div key={item.id} className="rounded-lg bg-white/[0.04] p-3 text-sm"><p className="font-medium">{item.label}</p>{item.content && <p className="mt-1 whitespace-pre-wrap text-white/60">{item.content}</p>}{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-cyan-200 underline">Open evidence link</a>}<p className="mt-1 text-xs text-white/35">Added by {item.submittedBy.name}</p></div>)}</div>}
        {dispute.resolutionNote && <p className="mt-3 rounded-lg bg-emerald-300/5 p-3 text-sm text-emerald-100">Admin decision: {dispute.resolutionNote}</p>}
      </article>)}</div>
      {["ACTIVE", "COMPLETED"].includes(collaborationStatus) && <form onSubmit={submitDispute} className="mt-4 space-y-3 rounded-xl border border-white/10 p-4">
        <h4 className="font-semibold">Open a dispute</h4>
        <select className={field} value={category} onChange={e => setCategory(e.target.value)}>{["PAYMENT","DELIVERABLE_QUALITY","MISSED_DEADLINE","SCOPE_CHANGE","COMMUNICATION","CONDUCT","OTHER"].map(x => <option key={x} value={x}>{pretty(x)}</option>)}</select>
        <input className={field} required minLength={5} maxLength={140} value={title} onChange={e => setTitle(e.target.value)} placeholder="Dispute title"/>
        <textarea className={field} required minLength={20} maxLength={4000} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain the issue and what outcome you are seeking (minimum 20 characters)"/>
        <div className="grid gap-2 sm:grid-cols-2"><input className={field} maxLength={140} value={evidenceLabel} onChange={e => setEvidenceLabel(e.target.value)} placeholder="Evidence label (optional)"/><input className={field} maxLength={2000} value={evidenceContent} onChange={e => setEvidenceContent(e.target.value)} placeholder="Evidence note (optional)"/></div>
        <button className={button} disabled={busy || title.trim().length < 5 || description.trim().length < 20}>Submit dispute</button>
      </form>}
    </div>
  </section>;
}
