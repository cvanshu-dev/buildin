"use client";
import { useCallback, useEffect, useState } from "react";

type Social = { id: string; handle: string; profileUrl: string };
type Item = { id: string; status: string; note: string | null; reviewNote?: string | null; applicant: { name: string; email: string; role: string; creatorProfile?: { displayName: string | null; city: string | null; state: string | null; socialAccounts: Social[] } | null } };

export function VerificationQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/verification", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Unable to load verification requests."); return; }
    setItems(data.requests ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const reviewNote = decision === "REJECTED" ? window.prompt("Reason for rejection (optional):") ?? "" : "";
    const response = await fetch("/api/verification", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, reviewNote }) });
    const data = await response.json();
    setMessage(response.ok ? "Review saved." : data.error ?? "Review failed.");
    if (response.ok) await load();
  }
  return <div className="mt-8 space-y-4">
    {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    {items.length === 0 ? <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">No verification requests.</p> : items.map((item) => {
      const instagram = item.applicant.creatorProfile?.socialAccounts.find((account) => account.profileUrl.includes("instagram.com"));
      return <article key={item.id} className="rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{item.applicant.creatorProfile?.displayName || item.applicant.name}</h2><p className="text-sm text-slate-600">{item.applicant.email} · {item.applicant.role}</p><p className="text-xs text-slate-500">{[item.applicant.creatorProfile?.city, item.applicant.creatorProfile?.state].filter(Boolean).join(", ")}</p></div><span className="text-xs text-slate-600">{item.status}</span></div>
        {item.note && <p className="mt-3 text-sm">{item.note}</p>}
        {item.applicant.role === "CREATOR" && <p className="mt-3 text-sm text-slate-600">Instagram username: {instagram ? <a href={instagram.profileUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">@{instagram.handle.replace(/^@/, "")}</a> : "Not provided"}</p>}
        {item.reviewNote && <p className="mt-2 text-xs text-slate-500">Review note: {item.reviewNote}</p>}
        {item.status === "PENDING" && <div className="mt-4 flex gap-2"><button onClick={() => void decide(item.id, "APPROVED")} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Approve</button><button onClick={() => void decide(item.id, "REJECTED")} className="rounded-full border border-red-400 px-4 py-2 text-sm text-red-600">Reject</button></div>}
      </article>;
    })}
  </div>;
}
