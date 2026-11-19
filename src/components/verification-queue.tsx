"use client";

import { useCallback, useEffect, useState } from "react";

type VerificationItem = {
  id: string; status: string; note: string | null;
  applicant: { name: string; email: string; role: string };
};
type QueueResponse = { requests: VerificationItem[]; error?: string };

export function VerificationQueue() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/verification");
    const data = (await response.json()) as QueueResponse;
    if (!response.ok) { setMessage(data.error ?? "Unable to load requests."); return; }
    setItems(data.requests);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const response = await fetch("/api/verification", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Review saved." : data.error ?? "Review failed.");
    if (response.ok) await load();
  }

  return (
    <div className="mt-8 space-y-4">
      {message && <p className="text-sm text-zinc-300">{message}</p>}
      {items.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">No verification requests.</p> :
        items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 p-5">
            <div className="flex justify-between">
              <div><h2 className="font-semibold">{item.applicant.name}</h2><p className="text-sm text-zinc-400">{item.applicant.email} · {item.applicant.role}</p></div>
              <span className="text-xs text-zinc-400">{item.status}</span>
            </div>
            {item.note && <p className="mt-3 text-sm">{item.note}</p>}
            {item.status === "PENDING" && <div className="mt-4 flex gap-2">
              <button onClick={() => decide(item.id, "APPROVED")} className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black">Approve</button>
              <button onClick={() => decide(item.id, "REJECTED")} className="rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-300">Reject</button>
            </div>}
          </article>
        ))}
    </div>
  );
}
