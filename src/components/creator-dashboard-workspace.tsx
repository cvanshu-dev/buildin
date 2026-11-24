"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, BriefcaseBusiness, CircleUserRound, Compass, FileText, Sparkles } from "lucide-react";

type Overview = {
  profile: { id:string; displayName:string|null; bio:string|null; city:string|null; state:string|null; isPublic:boolean; categories:string[]; specialties:string[]; portfolioItems:{id:string}[]; socialAccounts:{id:string}[] };
  applications: {id:string;pitch:string;proposedRate:number|null;status:string;createdAt:string;campaign:{id:string;title:string;status:string;applicationDeadline:string|null;brand:{name:string}}}[];
  collaborations: {id:string;status:string;agreedAmount:number|null;updatedAt:string;campaign:{id:string;title:string;brand:{name:string}};deliverables:{id:string;status:string;dueAt:string|null}[];agreement:{id:string;title:string;status:string}|null;_count:{messages:number}}[];
  notifications:{id:string;title:string;body:string;href:string|null;readAt:string|null;createdAt:string}[];
  unreadNotifications:number;
  campaignCount:number;
};
const statusTone=(s:string)=>["ACCEPTED","APPROVED","ACTIVE","COMPLETED"].includes(s)?"bg-emerald-50 text-emerald-700":["REJECTED","CANCELLED"].includes(s)?"bg-red-50 text-red-700":s==="CHANGES_REQUESTED"?"bg-amber-50 text-amber-800":"bg-blue-50 text-blue-700";
const money=(n:number|null)=>n==null?"Not agreed":new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
export function CreatorDashboardWorkspace(){
 const [data,setData]=useState<Overview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{try{setError("");const r=await fetch("/api/creator/overview",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load your workspace.");setData(d);}catch(e){setError(e instanceof Error?e.message:"Unable to load your workspace.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const completed=useMemo(()=>data?[Boolean(data.profile.displayName?.trim()),Boolean(data.profile.bio?.trim()),Boolean(data.profile.city?.trim()),Boolean(data.profile.state?.trim()),data.profile.categories.length>0,data.profile.specialties.length>0,data.profile.portfolioItems.length>0,data.profile.socialAccounts.length>0].filter(Boolean).length:0,[data]);
 if(loading)return <div className="animate-pulse space-y-4"><div className="h-28 rounded-2xl bg-slate-200"/><div className="grid gap-3 sm:grid-cols-4"><div className="h-24 rounded-2xl bg-slate-200"/><div className="h-24 rounded-2xl bg-slate-200"/><div className="h-24 rounded-2xl bg-slate-200"/><div className="h-24 rounded-2xl bg-slate-200"/></div></div>;
 if(error)return <section className="rounded-2xl border border-red-200 bg-white p-6"><p className="text-sm text-red-700">{error}</p><button onClick={()=>void load()} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Try again</button></section>;
 if(!data)return null;
 const pending=data.applications.filter(a=>["SUBMITTED","SHORTLISTED"].includes(a.status));
 const active=data.collaborations.filter(c=>c.status==="ACTIVE");
 const nextAction=active.length?{title:"Keep your collaboration moving",body:`${active[0].campaign.title} is active. Check deliverables, messages and deadlines.`,href:`/dashboard/creator/collaborations/${active[0].id}`,label:"Open workspace"}:pending.length?{title:"Your applications are in review",body:`${pending.length} application${pending.length===1?" is":"s are"} awaiting a brand decision.`,href:"/dashboard/creator/applications",label:"Track applications"}:completed<8?{title:"Finish setting up your creator profile",body:`${completed} of 8 profile essentials completed. A stronger profile gives brands better information to evaluate you.`,href:"/dashboard/creator/profile",label:"Complete profile"}:{title:"Find your next collaboration",body:"Explore active campaigns that match your categories and creative strengths.",href:"/dashboard/creator/campaigns",label:"Explore campaigns"};
 const stats=[{label:"Open campaigns",value:data.campaignCount,icon:Compass,href:"/dashboard/creator/campaigns",hint:"Discover opportunities"},{label:"Applications",value:data.applications.length,icon:FileText,href:"/dashboard/creator/applications",hint:`${pending.length} awaiting decision`},{label:"Active work",value:active.length,icon:BriefcaseBusiness,href:"/dashboard/creator/collaborations",hint:"Manage deliverables"},{label:"Unread updates",value:data.unreadNotifications,icon:Bell,href:"/dashboard/creator/notifications",hint:"View notifications"}];
 return <div className="space-y-6">
  <section className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white sm:flex-row sm:items-center sm:px-8">
   <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Creator workspace</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {data.profile.displayName||"creator"}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Your work, opportunities and brand conversations — all in one place.</p></div>
   <Link href="/dashboard/creator/campaigns" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500">Discover campaigns <ArrowRight size={16}/></Link>
  </section>
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {stats.map(({label,value,icon:Icon,href,hint})=><Link key={label} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={17}/></span></div><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></Link>)}
  </section>
  <section className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
   <div className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-blue-700"><Sparkles size={15}/> Your next step</div>
    <h3 className="mt-3 text-xl font-semibold text-slate-950">{nextAction.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{nextAction.body}</p>
    <Link href={nextAction.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">{nextAction.label}<ArrowRight size={15}/></Link>
   </div>
   <div className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-blue-700">Profile strength</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{Math.round(completed/8*100)}% complete</h3></div><CircleUserRound className="text-slate-400" size={23}/></div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:(completed/8*100)+"%"}}/></div>
    <p className="mt-3 text-sm text-slate-600">{completed}/8 essentials complete · {data.profile.isPublic?"Your profile is public":"Your profile is private"}</p>
    <Link href="/dashboard/creator/profile" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Manage profile <ArrowRight size={14}/></Link>
   </div>
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-6">
   <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-blue-700">In progress</p><h3 className="mt-1 text-lg font-semibold text-slate-950">Active collaborations</h3></div><Link href="/dashboard/creator/collaborations" className="text-sm font-semibold text-blue-700">View all <ArrowRight className="inline" size={14}/></Link></div>
   {active.length===0?<div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-medium text-slate-800">No active collaborations yet</p><p className="mt-1 text-sm text-slate-500">Accepted campaigns will appear here when a brand starts working with you.</p></div>:<div className="mt-4 divide-y divide-slate-100">{active.slice(0,3).map(c=><div key={c.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><h4 className="font-semibold text-slate-900">{c.campaign.title}</h4><p className="mt-1 text-sm text-slate-500">{c.campaign.brand.name} · {c.deliverables.filter(d=>d.status==="APPROVED").length}/{c.deliverables.length} deliverables approved · {c._count.messages} messages</p></div><div className="flex items-center gap-3"><span className="text-sm font-medium text-slate-700">{money(c.agreedAmount)}</span><Link href={"/dashboard/creator/collaborations/"+c.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Open</Link></div></div>)}</div>}
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-6">
   <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-blue-700">Latest activity</p><h3 className="mt-1 text-lg font-semibold text-slate-950">Recent updates</h3></div><Link href="/dashboard/creator/notifications" className="text-sm font-semibold text-blue-700">Inbox <ArrowRight className="inline" size={14}/></Link></div>
   {data.notifications.length===0?<p className="mt-4 text-sm text-slate-500">You're all caught up. New messages and campaign updates will appear here.</p>:<div className="mt-3 divide-y divide-slate-100">{data.notifications.slice(0,3).map(n=><div key={n.id} className="flex items-start gap-3 py-3"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt?"bg-slate-200":"bg-blue-600"}`}/><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{n.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{n.body}</p><p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("en-IN")}</p></div></div>)}</div>}
  </section>
 </div>;
}
