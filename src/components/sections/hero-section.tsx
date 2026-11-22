import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, Users, Workflow } from "lucide-react";

const features = [
  { icon: Search, title: "Discover talent", body: "Find creators by category, platform and location." },
  { icon: Users, title: "Build partnerships", body: "Shortlist, invite and review applications in one place." },
  { icon: Workflow, title: "Manage campaigns", body: "Keep briefs, deliverables and feedback organised." },
];
export function HeroSection() {
  return <section className="bg-white">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><span className="size-1.5 rounded-full bg-blue-600"/> The creator partnership platform</div>
        <h1 className="mt-7 max-w-2xl text-[clamp(2.8rem,6vw,5.25rem)] font-bold leading-[1.02] tracking-[-.065em] text-slate-950">Great campaigns start with the <span className="text-blue-700">right people.</span></h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Buildin brings brands and creators together to discover talent, launch campaigns and manage collaborations — all in one clear workspace.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/sign-up" className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Get started <ArrowRight size={16}/></Link><Link href="/how-it-works" className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">See how it works</Link></div>
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-blue-700"/> Built for brands</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-blue-700"/> Made for creators</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-blue-700"/> One shared workflow</span></div>
      </div>
      <div className="relative">
        <div className="absolute -inset-4 rounded-[2rem] bg-blue-50"/>
        <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Workspace preview</p><h2 className="mt-1 text-base font-bold text-slate-900">Creator campaign</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Active</span></div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">{[["24","Creators"],["08","Shortlisted"],["04","In progress"]].map(([n,l])=><div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{n}</p><p className="mt-1 text-[10px] text-slate-500 sm:text-xs">{l}</p></div>)}</div>
          <div className="mt-5 space-y-3">{features.map(({icon:Icon,title,body},i)=><div key={title} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={18}/></span><div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-500">{body}</p></div><span className="ml-auto text-xs font-semibold text-slate-300">0{i+1}</span></div>)}</div>
          <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white"><p className="text-xs font-semibold">One organised workflow</p><p className="mt-1 text-xs leading-5 text-slate-300">From the first campaign brief to the final deliverable.</p></div>
        </div>
      </div>
    </div>
  </section>;
}
