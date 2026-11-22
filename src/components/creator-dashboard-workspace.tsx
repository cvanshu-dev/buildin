"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Overview = {
  profile: { id: string; displayName: string | null; isPublic: boolean; categories: string[]; specialties: string[]; portfolioItems: {id:string}[]; socialAccounts: {id:string}[] };
  applications: { id:string; pitch:string; proposedRate:number|null; status:string; createdAt:string; campaign:{id:string;title:string;status:string;applicationDeadline:string|null;brand:{name:string}} }[];
  collaborations: { id:string; status:string; agreedAmount:number|null; updatedAt:string; campaign:{id:string;title:string;brand:{name:string}}; deliverables:{id:string;status:string;dueAt:string|null}[]; agreement:{id:string;title:string;status:string}|null; _count:{messages:number} }[];
  notifications: {id:string;title:string;body:string;href:string|null;readAt:string|null;createdAt:string}[];
  unreadNotifications:number;
  campaignCount:number;
};

const statusClass = (status:string) => status === "ACCEPTED" || status === "APPROVED" ? "text-lime-300" : status === "REJECTED" ? "text-red-300" : status === "CHANGES_REQUESTED" ? "text-amber-300" : "text-zinc-300";
const money = (amount:number|null) => amount == null ? "Not agreed" : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount);

export function CreatorDashboardWorkspace() {
  const [data,setData]=useState<Overview|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{try{setError("");const r=await fetch("/api/creator/overview",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load dashboard.");setData(d);}catch(e){setError(e instanceof Error?e.message:"Unable to load dashboard.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const pending=useMemo(()=>data?.applications.filter(a=>a.status==="SUBMITTED"||a.status==="SHORTLISTED").length??0,[data]);
  const active=useMemo(()=>data?.collaborations.filter(c=>c.status==="ACTIVE").length??0,[data]);
  async function markAllRead(){const r=await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markAllRead:true})});const d=await r.json();if(!r.ok){setNotice(d.error||"Unable to update notifications.");return;}setNotice("Notifications marked as read.");await load();}
  if(loading)return <p className="mt-8 text-sm text-zinc-400">Loading creator workspace…</p>;
  if(error)return <section className="mt-8 rounded-2xl border border-red-400/20 p-5"><p className="text-sm text-red-300">{error}</p><button onClick={()=>void load()} className="mt-3 rounded-full border border-white/20 px-4 py-2 text-sm">Retry</button></section>;
  if(!data)return null;
  const profileScore=[Boolean(data.profile.displayName),data.profile.categories.length>0,data.profile.specialties.length>0,data.profile.portfolioItems.length>0,data.profile.socialAccounts.length>0].filter(Boolean).length;
  return <div className="mt-8 space-y-8">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Open campaigns",data.campaignCount],["Applications",data.applications.length],["Awaiting decisions",pending],["Active collaborations",active]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-sm text-zinc-400">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}
    </section>
    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-lime-300">Your creator profile</p><h2 className="mt-2 text-xl font-semibold">{data.profile.displayName||"Complete your profile"}</h2></div><span className={data.profile.isPublic?"text-lime-300":"text-amber-300"}>{data.profile.isPublic?"Public":"Private"}</span></div>
        <p className="mt-3 text-sm text-zinc-400">Profile setup checklist: {profileScore}/5 key sections completed. Add strong portfolio work and social accounts before applying to campaigns.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lime-300" style={{width:(profileScore/5*100)+"%"}}/></div>
        <Link href={"/creators/"+data.profile.id} className="mt-5 inline-block text-sm text-lime-300 underline underline-offset-4">View public profile</Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs uppercase tracking-widest text-lime-300">Quick actions</p><div className="mt-4 grid gap-3"><Link className="rounded-xl bg-lime-300 px-4 py-3 text-center text-sm font-semibold text-black" href="/dashboard/creator/invitations">Review brand invitations</Link><Link className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm" href="/dashboard/creator/campaigns">Browse and apply to campaigns</Link><a className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm" href="#profile">Edit creator profile</a><a className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm" href="#applications">Track applications</a></div></div>
    </section>
    <section id="applications" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-lime-300">Campaign pipeline</p><h2 className="mt-2 text-xl font-semibold">Your applications</h2></div><Link href="/dashboard/creator/campaigns" className="text-sm text-lime-300">Find campaigns →</Link></div>
      {data.applications.length===0?<p className="mt-5 text-sm text-zinc-400">No applications yet. Browse open campaigns and submit a tailored pitch.</p>:<div className="mt-4 divide-y divide-white/10">{data.applications.map(a=><article key={a.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><h3 className="font-medium">{a.campaign.title}</h3><p className="mt-1 text-sm text-zinc-400">{a.campaign.brand.name} · Applied {new Date(a.createdAt).toLocaleDateString()}</p><p className="mt-2 line-clamp-2 text-sm text-zinc-400">{a.pitch}</p>{a.proposedRate!=null&&<p className="mt-1 text-xs text-zinc-500">Proposed rate: {money(a.proposedRate)}</p>}</div><div className="sm:text-right"><p className={"text-sm font-medium "+statusClass(a.status)}>{a.status.replaceAll("_"," ")}</p>{a.status==="ACCEPTED"&&<p className="mt-1 text-xs text-zinc-500">Collaboration created</p>}</div></article>)}</div>}
    </section>
    <section id="collaborations" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div><p className="text-xs uppercase tracking-widest text-lime-300">Work in progress</p><h2 className="mt-2 text-xl font-semibold">Collaborations</h2></div>
      {data.collaborations.length===0?<p className="mt-5 text-sm text-zinc-400">Accepted applications will appear here with deliverables, messages and agreement details.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{data.collaborations.map(c=><article key={c.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-3"><div><h3 className="font-medium">{c.campaign.title}</h3><p className="mt-1 text-sm text-zinc-400">{c.campaign.brand.name}</p></div><span className={"text-xs "+statusClass(c.status)}>{c.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><p className="text-lg font-semibold">{c.deliverables.length}</p><p className="text-xs text-zinc-500">Tasks</p></div><div><p className="text-lg font-semibold">{c.deliverables.filter(d=>d.status==="APPROVED").length}</p><p className="text-xs text-zinc-500">Approved</p></div><div><p className="text-lg font-semibold">{c._count.messages}</p><p className="text-xs text-zinc-500">Messages</p></div></div><p className="mt-3 text-sm text-zinc-400">Agreed amount: {money(c.agreedAmount)}</p><Link href={"/dashboard/creator/collaborations/"+c.id} className="mt-4 inline-block text-sm text-lime-300 underline underline-offset-4">Open workspace →</Link></article>)}</div>}
    </section>
    <section id="notifications" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-lime-300">Updates</p><h2 className="mt-2 text-xl font-semibold">Notifications <span className="text-sm font-normal text-zinc-400">({data.unreadNotifications} unread)</span></h2></div>{data.unreadNotifications>0&&<button onClick={()=>void markAllRead()} className="rounded-full border border-white/20 px-4 py-2 text-sm">Mark all read</button>}</div>
      {data.notifications.length===0?<p className="mt-4 text-sm text-zinc-400">No notifications yet.</p>:<div className="mt-4 divide-y divide-white/10">{data.notifications.map(n=><div key={n.id} className="py-3"><div className="flex items-start justify-between gap-3"><p className="font-medium">{n.title}</p>{!n.readAt&&<span className="mt-1 h-2 w-2 rounded-full bg-lime-300"/>}</div><p className="mt-1 text-sm text-zinc-400">{n.body}</p><p className="mt-1 text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</p></div>)}</div>}
      {notice&&<p role="status" className="mt-3 text-sm text-zinc-300">{notice}</p>}
    </section>
    <div id="profile"><h2 className="text-xl font-semibold">Profile, portfolio and verification</h2><p className="mt-1 text-sm text-zinc-400">Keep your public profile accurate. Only publish details you can substantiate.</p></div>
  </div>;
}
