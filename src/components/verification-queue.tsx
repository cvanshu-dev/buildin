"use client";

import { useCallback, useEffect, useState } from "react";

type SocialAccount = { id: string; platform: string; handle: string; profileUrl: string };
type VerificationItem = {
  id: string;
  status: string;
  note: string | null;
  reviewNote?: string | null;
  applicant: {
    name: string;
    email: string;
    role: string;
    creatorProfile?: {
      displayName: string | null;
      city: string | null;
      state: string | null;
      socialAccounts: SocialAccount[];
    } | null;
  };
};

export function VerificationQueue() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/verification", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to load requests.");
      return;
    }
    setItems(data.requests ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const reviewNote = decision === "REJECTED" ? window.prompt("Reason for rejection (optional):") ?? "" : "";
    const response = await fetch("/api/verification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision, reviewNote }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Review saved." : data.error ?? "Review failed.");
    if (response.ok) await load();
  }

  return (
    <div className="mt-8 space-y-4">
      {message && <p role="status" className="rounded-xl border border-slate-200 p-3 text-sm">{message}</p>}
      {items.length === 0 ? <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">No verification requests.</p> :
        items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{item.applicant.creatorProfile?.displayName || item.applicant.name}</h2>
                <p className="text-sm text-slate-600">{item.applicant.email} · {item.applicant.role}</p>
                <p className="text-xs text-slate-500">{[item.applicant.creatorProfile?.city, item.applicant.creatorProfile?.state].filter(Boolean).join(", ")}</p>
              </div>
              <span className="text-xs text-slate-600">{item.status}</span>
            </div>
            {item.note && <p className="mt-3 text-sm">{item.note}</p>}
            {item.applicant.role === "CREATOR" && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Submitted social profiles</h3>
                {item.applicant.creatorProfile?.socialAccounts.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.applicant.creatorProfile.socialAccounts.map((social) => (
                      <a key={social.id} href={social.profileUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-blue-700 underline">
                        {social.platform} · @{social.handle.replace(/^@/, "")}
                      </a>
                    ))}
                  </div>
                ) : <p className="mt-1 text-xs text-slate-500">No Instagram username submitted.</p>}
              </div>
            )}
            {item.reviewNote && <p className="mt-2 text-xs text-slate-500">Review note: {item.reviewNote}</p>}
            {item.status === "PENDING" && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => void decide(item.id, "APPROVED")} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                <button onClick={() => void decide(item.id, "REJECTED")} className="rounded-full border border-red-400 px-4 py-2 text-sm text-red-600">Reject</button>
              </div>
            )}
          </article>
        ))}
    </div>
  );
}
