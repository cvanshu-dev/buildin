"use client";

import { useCallback, useEffect, useState } from "react";

type Tab = "Overview" | "Users" | "Campaigns" | "Applications" | "Verifications" | "Collaborations" | "Audit";
// API payloads are heterogeneous across the admin tables; keep this boundary explicit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Overview = {
  metrics: { users: number; activeUsers: number; suspendedUsers: number; brands: number; creators: number; pendingVerifications: number; pendingDisputes: number; pendingReviewReports: number; committedAmount: number };
  campaignCounts: Record<string, number>; applicationCounts: Record<string, number>;
  collaborationCounts: Record<string, number>; deliverableCounts: Record<string, number>;
  recentUsers: Row[]; recentCampaigns: Row[]; recentCollaborations: Row[]; recentAudit: Row[];
  permissions: { canManageUsers: boolean; canManageCampaigns: boolean; canReviewVerification: boolean; canViewAudit: boolean; canViewUsers: boolean };
};
const pretty = (s: string) => s.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number | null | undefined) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const date = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const tabs: Tab[] = ["Overview", "Users", "Campaigns", "Applications", "Verifications", "Collaborations", "Audit"];


function Status({ value }: { value: string }) {
  const cls = ["ACTIVE", "APPROVED", "PUBLISHED", "COMPLETED", "ACCEPTED"].includes(value)
    ? "bg-blue-50 text-blue-700"
    : ["REJECTED", "SUSPENDED", "CLOSED", "CANCELLED"].includes(value)
      ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] ${cls}`}>{pretty(value)}</span>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 p-5"><h3 className="mb-4 font-semibold">{title}</h3>{children}</section>;
}
function Counts({ data }: { data: Record<string, number> }) {
  return Object.keys(data).length ? <div className="space-y-3">{Object.entries(data).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span className="text-slate-600">{pretty(k)}</span><span className="tabular-nums">{v}</span></div>)}</div> : <Empty>No data yet.</Empty>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
}
function ActionButton({ children, onClick, disabled, danger = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 ${danger ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{children}</button>;
}

export function AdminDashboard({ role, name }: { role: string; name: string }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [managers, setManagers] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      if (tab === "Overview") {
        const r = await fetch("/api/admin/overview", { cache: "no-store" });
        const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Could not load overview");
        setOverview(d);
      } else {
        const endpoints: Partial<Record<Tab, string>> = {
          Users: "/api/admin/users", Campaigns: "/api/admin/campaigns", Applications: "/api/admin/applications",
          Verifications: "/api/verification", Collaborations: "/api/admin/collaborations", Audit: "/api/admin/audit",
        };
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status) params.set(tab === "Verifications" ? "status" : "status", status);
        if (tab !== "Verifications") params.set("page", String(page));
        const r = await fetch(`${endpoints[tab]}?${params.toString()}`, { cache: "no-store" });
        const d = await r.json(); if (!r.ok) throw new Error(d.error ?? `Could not load ${tab.toLowerCase()}`);
        if (tab === "Verifications") { setItems(d.requests ?? []); setTotal((d.requests ?? []).length); setPageSize(Math.max(1, (d.requests ?? []).length)); }
        else { setItems(d.items ?? []); setTotal(d.total ?? 0); setPageSize(d.pageSize ?? 20); }
        setManagers(d.managers ?? []);
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }, [tab, q, status, page]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(url: string, body: Row, success: string) {
    setBusy(url); setMessage("");
    try {
      const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Update failed");
      setMessage(success); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusy(""); }
  }

  async function openUserDetails(userId: string) {
    setSelectedUser(null);
    setUserDetailLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/" + encodeURIComponent(userId) + "/details", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load account details.");
      setSelectedUser(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load account details.");
    } finally {
      setUserDetailLoading(false);
    }
  }

  const canUsers = role === "SUPER_ADMIN" || role === "ADMIN";
  const canCampaigns = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(role);
  const canVerify = ["SUPER_ADMIN", "ADMIN"].includes(role);
  const canAudit = ["SUPER_ADMIN", "ADMIN"].includes(role);
  const visibleTabs = tabs.filter(t => {
    if (t === "Users") return canUsers;
    
    if (t === "Audit") return canAudit;
    if (t === "Verifications") return canVerify;
    if (t === "Campaigns" || t === "Applications") return canCampaigns;
    return true;
  });

  return <div className="mt-9">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
      <div><p className="text-sm text-slate-600">Signed in as {name}</p><h2 className="mt-1 text-2xl font-semibold">Platform operations</h2><p className="mt-1 text-sm text-slate-500">{pretty(role)} access · protected operational controls</p></div>
      <button onClick={() => void load()} className="rounded-full border border-slate-200 px-4 py-2 text-sm">Refresh data</button>
    </div>
    <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">{visibleTabs.map(t => <button key={t} onClick={() => { setTab(t); setPage(1); setStatus(""); setQ(""); }} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === t ? "bg-blue-600 font-semibold text-zinc-950" : "border border-slate-200 text-slate-700"}`}>{t}</button>)}</nav>
    {message && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">{message}</p>}
    {loading && <p className="py-5 text-sm text-slate-500">Loading {tab.toLowerCase()}…</p>}

    {tab === "Overview" && overview && <section className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Accounts", overview.metrics.users, `${overview.metrics.brands} brands · ${overview.metrics.creators} creators`],
          ["Pending verification", overview.metrics.pendingVerifications, "Awaiting review"],
          ["Campaigns", Object.values(overview.campaignCounts).reduce((a,b)=>a+b,0), `${overview.campaignCounts.PUBLISHED ?? 0} published`],
          ["Collaborations", Object.values(overview.collaborationCounts).reduce((a,b)=>a+b,0), `${overview.collaborationCounts.ACTIVE ?? 0} active`],
          ["Committed value", money(overview.metrics.committedAmount), "Agreed amounts, not cash received or paid"],
          ["Active accounts", overview.metrics.activeUsers, "Accounts currently enabled"],
          ["Suspended accounts", overview.metrics.suspendedUsers, "Accounts blocked from access"],
          ...(canAudit ? [["Open disputes", overview.metrics.pendingDisputes, "Open or under review"] as const, ["Pending review reports", overview.metrics.pendingReviewReports, "Reports awaiting moderation"] as const] : []),
        ].map(([label, value, sub]) => <div key={String(label)} className="rounded-2xl border border-slate-200 p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Campaign pipeline"><Counts data={overview.campaignCounts}/></Panel>
        <Panel title="Application pipeline"><Counts data={overview.applicationCounts}/></Panel>
        <Panel title="Collaboration status"><Counts data={overview.collaborationCounts}/><div className="mt-4 border-t border-slate-200 pt-4"><p className="mb-3 text-xs text-slate-500">Deliverables</p><Counts data={overview.deliverableCounts}/></div></Panel>
        {canAudit && <Panel title="Recent staff activity">{overview.recentAudit.length ? overview.recentAudit.map(a => <div key={a.id} className="flex justify-between gap-3 border-b border-white/5 py-2 text-sm"><div>{pretty(a.action)}<p className="text-xs text-slate-500">{a.actor?.name ?? "System"} · {a.entityType}</p></div><time className="text-xs text-slate-500">{date(a.createdAt)}</time></div>) : <Empty>No audit events recorded.</Empty>}</Panel>}
      </div>
      <Panel title="Recent campaigns">{overview.recentCampaigns.map(c => <div key={c.id} className="flex justify-between gap-3 border-b border-white/5 py-3 text-sm"><div>{c.title}<p className="text-xs text-slate-500">{c.brand?.name ?? "Unknown brand"} · {c._count.applications} applications</p></div><Status value={c.status}/></div>)}{!overview.recentCampaigns.length && <Empty>No recent campaigns.</Empty>}</Panel>
    </section>}

    {tab !== "Overview" && tab !== "Verifications" && <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <input value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} onKeyDown={e=>{if(e.key==="Enter")void load();}} placeholder="Search records…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"/>

      <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"><option value="">All statuses</option>{(tab==="Campaigns"?["DRAFT","PUBLISHED","PAUSED","CLOSED"]:tab==="Applications"?["SUBMITTED","SHORTLISTED","ACCEPTED","REJECTED"]:tab==="Collaborations"?["ACTIVE","COMPLETED","CANCELLED"]:tab==="Audit"?[]:["ACTIVE","SUSPENDED"]).map(x=><option key={x} value={x}>{pretty(x)}</option>)}</select>
      <button onClick={()=>void load()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-zinc-950">Search</button>
    </div>}

    {tab === "Users" && <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Account","Role","Brand / Creator","Joined","Status","Action"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{items.map(u=><tr key={u.id} className="border-t border-white/5"><td className="px-4 py-4">{u.name}<p className="text-xs text-slate-500">{u.email}</p></td><td className="px-4 py-4"><span className="font-medium text-slate-800">{pretty(u.role)}</span></td><td className="px-4 py-4 text-slate-600">{u.brandMemberships?.[0]?.brand.name ?? u.creatorProfile?.displayName ?? [u.creatorProfile?.city,u.creatorProfile?.state].filter(Boolean).join(", ") ?? "—"}</td><td className="px-4 py-4 text-slate-600">{date(u.createdAt)}</td><td className="px-4 py-4"><Status value={u.status}/></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2">{canUsers && <ActionButton disabled={userDetailLoading} onClick={()=>void openUserDetails(u.id)}>View details</ActionButton>}{["ADMIN","SUPER_ADMIN"].includes(role) && <ActionButton danger={u.status==="ACTIVE"} disabled={busy.includes(u.id)} onClick={()=>{const next=u.status==="ACTIVE"?"SUSPENDED":"ACTIVE";if(window.confirm(`${next==="SUSPENDED"?"Suspend":"Reactivate"} ${u.name}?`))void mutate(`/api/admin/users/${u.id}`,{status:next},"Account status updated.");}}>{u.status==="ACTIVE"?"Suspend":"Reactivate"}</ActionButton>}</div></td></tr>)}</tbody></table>{!items.length&&<Empty>No matching users.</Empty>}</div>}

    {tab === "Campaigns" && <div className="mt-4 space-y-3">{items.map(c=><article key={c.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap justify-between gap-3"><div className="font-medium">{c.title}<p className="mt-1 text-xs text-slate-500">{c.brand?.name ?? "Unknown brand"} · {pretty(c.managementMode)} · {c._count.applications} applications · {c._count.collaborations} collaborations</p><p className="mt-1 text-xs text-slate-500">Budget {money(c.budgetMin)}–{money(c.budgetMax)} · {c.slots} slots · Updated {date(c.updatedAt)}</p></div><Status value={c.status}/></div><div className="mt-4 flex flex-wrap gap-2">{canCampaigns && <select value={c.status} disabled={busy.includes(c.id)} onChange={e=>void mutate(`/api/admin/campaigns/${c.id}`,{status:e.target.value},"Campaign status updated.")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value={c.status}>{pretty(c.status)}</option>{(c.status==="DRAFT"?["PUBLISHED"]:c.status==="PUBLISHED"?["PAUSED","CLOSED"]:c.status==="PAUSED"?["PUBLISHED","CLOSED"]:[]).map(x=><option key={x} value={x}>{pretty(x)}</option>)}</select>}{role!=="CAMPAIGN_MANAGER" && <select value={c.assignedManagerId ?? ""} disabled={busy.includes(c.id)} onChange={e=>void mutate(`/api/admin/campaigns/${c.id}`,{assignedManagerId:e.target.value||null},"Campaign assignment updated.")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"><option value="">Unassigned manager</option>{managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>}</div></article>)}{!items.length&&<Empty>No campaigns match these filters.</Empty>}</div>}

    {tab === "Applications" && <div className="mt-4 space-y-3">{items.map(a=><article key={a.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap justify-between gap-3"><div className="font-medium">{a.creatorProfile?.displayName ?? a.creatorProfile?.user?.name ?? "Unknown creator"}<p className="text-xs text-slate-500">{a.creatorProfile?.user?.email ?? "No email"} · {a.campaign?.title ?? "Unknown campaign"} · {a.campaign?.brand?.name ?? "Unknown brand"}</p><p className="mt-1 text-xs text-slate-500">{a.creatorProfile?.city ?? "Location not set"} · Proposed {money(a.proposedRate)}</p></div><Status value={a.status}/></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{a.pitch ?? "No pitch provided."}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{(a.creatorProfile?.socialAccounts ?? []).map((s:Row)=><span key={s.platform} className="rounded-full border border-slate-200 px-3 py-1">{s.platform} · {(s.followers ?? 0).toLocaleString("en-IN")} followers</span>)}</div>{["SUBMITTED","SHORTLISTED"].includes(a.status)&&<div className="mt-4 flex flex-wrap gap-2"><ActionButton disabled={!!busy} onClick={()=>void mutate("/api/admin/applications",{applicationId:a.id,decision:"SHORTLISTED"},"Creator shortlisted.")}>Shortlist</ActionButton><ActionButton disabled={!!busy} onClick={()=>{if(window.confirm("Accept this creator and open a collaboration?"))void mutate("/api/admin/applications",{applicationId:a.id,decision:"ACCEPTED"},"Creator accepted; collaboration opened.");}}>Accept</ActionButton><ActionButton danger disabled={!!busy} onClick={()=>{if(window.confirm("Reject this application?"))void mutate("/api/admin/applications",{applicationId:a.id,decision:"REJECTED"},"Application rejected.");}}>Reject</ActionButton></div>}</article>)}{!items.length&&<Empty>No applications match these filters.</Empty>}</div>}

    {tab === "Verifications" && <div className="mt-4 space-y-3">
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Review creator profiles and submitted Instagram usernames. Buildin does not automatically collect Instagram metrics.</p>
      {items.map(v=><article key={v.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap justify-between gap-3"><div className="font-medium">{v.applicant.creatorProfile?.displayName || v.applicant.name}<p className="text-xs text-slate-500">{v.applicant.email} · {pretty(v.applicant.role)} · {date(v.createdAt)}</p><p className="text-xs text-slate-500">{[v.applicant.creatorProfile?.city,v.applicant.creatorProfile?.state].filter(Boolean).join(", ")}</p></div><Status value={v.status}/></div>{v.note&&<p className="mt-3 text-sm text-slate-700">{v.note}</p>}
      {v.applicant.role === "CREATOR" && <p className="mt-3 text-sm text-slate-600">Instagram username: {(v.applicant.creatorProfile?.socialAccounts ?? []).find((social:Row) => social.platform === "INSTAGRAM")?.handle ?? "Not provided"}</p>}
      {v.reviewNote&&<p className="mt-2 text-xs text-slate-500">Review note: {v.reviewNote}</p>}{v.status==="PENDING"&&<div className="mt-4 flex gap-2"><ActionButton disabled={!!busy} onClick={()=>{const note=window.prompt("Optional review note:");if(note!==null)void mutate("/api/verification",{id:v.id,decision:"APPROVED",reviewNote:note},"Verification approved.");}}>Approve</ActionButton><ActionButton danger disabled={!!busy} onClick={()=>{const note=window.prompt("Reason for rejection:");if(note!==null)void mutate("/api/verification",{id:v.id,decision:"REJECTED",reviewNote:note},"Verification rejected.");}}>Reject</ActionButton></div>}</article>)}{!items.length&&<Empty>No verification requests.</Empty>}</div>}

    {tab === "Collaborations" && <div className="mt-4 space-y-3">{items.map(c=><article key={c.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap justify-between gap-3"><div className="font-medium">{c.campaign.title}<p className="mt-1 text-xs text-slate-500">{c.campaign.brand.name} · {c.creatorProfile.displayName ?? c.creatorProfile.user.name} · {c._count.deliverables} deliverables · {c._count.messages} messages</p><p className="mt-1 text-xs text-slate-500">{c.campaign.managementMode} · Updated {date(c.updatedAt)}</p></div><div className="text-right"><p className="mb-2 text-sm">{money(c.agreedAmount)}</p><Status value={c.status}/></div></div><div className="mt-3 flex flex-wrap gap-2">{c.deliverables.map((d:Row,i:number)=><span key={i} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">{pretty(d.status)}</span>)}</div></article>)}{!items.length&&<Empty>No collaborations match these filters.</Empty>}</div>}

    {tab === "Audit" && <div className="mt-4 space-y-2">{items.map(a=><article key={a.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row"><div className="text-sm font-medium">{pretty(a.action)}<p className="mt-1 text-xs text-slate-500">{a.actor?.name ?? "System"} · {a.actor?.email ?? "—"} · {a.entityType} / {a.entityId}</p>{a.metadata&&<p className="mt-1 break-all text-xs text-zinc-600">{JSON.stringify(a.metadata)}</p>}</div><time className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString("en-IN")}</time></article>)}{!items.length&&<Empty>No audit events recorded.</Empty>}<p className="text-xs text-slate-500">Audit records are append-only; editing and deletion are not exposed.</p></div>}

    {userDetailLoading && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-700">Loading account details…</div></div>}
    {selectedUser && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Account details">
      <div className="mx-auto my-6 max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div><p className="text-xs uppercase tracking-wide text-slate-500">Account record</p><h3 className="mt-1 text-xl font-semibold">{selectedUser.user.name}</h3><p className="text-sm text-slate-600">{selectedUser.user.email}</p><div className="mt-3 flex flex-wrap gap-2"><Status value={selectedUser.user.role}/><Status value={selectedUser.user.status}/><span className="text-xs text-slate-500">Joined {date(selectedUser.user.createdAt)}</span></div></div>
          <button onClick={()=>setSelectedUser(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Close</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Panel title="Account status"><div className="space-y-2 text-sm"><p>Email verified: <strong>{selectedUser.user.emailVerified ? "Yes" : "No"}</strong></p><p>Onboarding completed: <strong>{selectedUser.user.onboardingDone ? "Yes" : "No"}</strong></p><p>Last updated: <strong>{date(selectedUser.user.updatedAt)}</strong></p><p>Reviews written: <strong>{selectedUser.user._count.authoredReviews}</strong></p><p>Reviews received: <strong>{selectedUser.user._count.receivedReviews}</strong></p><p>Disputes opened: <strong>{selectedUser.user._count.openedDisputes}</strong></p></div></Panel>
          <Panel title="Creator profile">{selectedUser.user.creatorProfile ? <div className="space-y-2 text-sm"><p className="font-medium">{selectedUser.user.creatorProfile.displayName ?? "Name not set"}</p><p>{[selectedUser.user.creatorProfile.city,selectedUser.user.creatorProfile.state].filter(Boolean).join(", ") || "Location not set"}</p><p>Public profile: {selectedUser.user.creatorProfile.isPublic ? "Yes" : "No"}</p><p>Applications: {selectedUser.user.creatorProfile._count.applications} · Collaborations: {selectedUser.user.creatorProfile._count.collaborations} · Portfolio items: {selectedUser.user.creatorProfile._count.portfolioItems}</p><p className="text-slate-600">{(selectedUser.user.creatorProfile.categories ?? []).join(", ") || "No categories"}</p></div> : <Empty>No creator profile.</Empty>}</Panel>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel title="Brand memberships">{selectedUser.user.brandMemberships?.length ? selectedUser.user.brandMemberships.map((membership:Row,i:number)=><div key={i} className="border-b border-slate-100 py-2 text-sm last:border-0"><p className="font-medium">{membership.brand.name}</p><p className="text-xs text-slate-500">{membership.title ?? "Member"} · {membership.brand.industry ?? "Industry not set"} · {membership.brand.city ?? "Location not set"}</p><p className="text-xs text-slate-500">{membership.brand._count.campaigns} campaigns · {membership.brand._count.members} members</p></div>) : <Empty>No brand memberships.</Empty>}</Panel>
          <Panel title="Social accounts">{selectedUser.user.creatorProfile?.socialAccounts?.length ? selectedUser.user.creatorProfile.socialAccounts.map((social:Row)=><div key={social.platform} className="border-b border-slate-100 py-2 text-sm last:border-0"><p className="font-medium">{social.platform} · @{social.handle}</p><p className="text-xs text-slate-500">{social.followers == null ? "Follower count not provided" : social.followers.toLocaleString("en-IN")+" followers"} · {social.source}</p></div>) : <Empty>No social accounts.</Empty>}</Panel>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel title="Verification history">{selectedUser.user.verificationRequests?.length ? selectedUser.user.verificationRequests.map((request:Row)=><div key={request.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><div className="flex justify-between gap-2"><Status value={request.status}/><span className="text-xs text-slate-500">{date(request.createdAt)}</span></div>{request.note && <p className="mt-1 text-slate-600">{request.note}</p>}{request.reviewNote && <p className="mt-1 text-xs text-slate-500">Review: {request.reviewNote}</p>}</div>) : <Empty>No verification requests.</Empty>}</Panel>
          <Panel title="Recent reviews">{selectedUser.recentReviews?.length ? selectedUser.recentReviews.map((review:Row)=><div key={review.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><p className="font-medium">{review.rating}/5 · {review.title ?? "Review"}</p><p className="text-xs text-slate-500">{review.collaboration?.campaign?.title ?? "Collaboration"} · {pretty(review.status)}</p><p className="mt-1 text-slate-600">{review.comment}</p></div>) : <Empty>No reviews.</Empty>}</Panel>
        </div>
        <div className="mt-4"><Panel title="Recent account audit events">{selectedUser.recentAudit?.length ? selectedUser.recentAudit.map((event:Row)=><div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0"><div>{pretty(event.action)}<p className="text-xs text-slate-500">{event.actor?.name ?? "System"}</p></div><time className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString("en-IN")}</time></div>) : <Empty>No account-specific audit events.</Empty>}</Panel></div>
      </div>
    </div>}

    {tab !== "Overview" && tab !== "Verifications" && total > pageSize && <div className="mt-5 flex items-center justify-between text-sm text-slate-600"><span>{total.toLocaleString("en-IN")} records · Page {page} of {Math.ceil(total/pageSize)}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30">Previous</button><button disabled={page>=Math.ceil(total/pageSize)} onClick={()=>setPage(p=>p+1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30">Next</button></div></div>}
  </div>;
}
