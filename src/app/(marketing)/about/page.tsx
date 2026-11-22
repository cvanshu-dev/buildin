import { SiteHeader } from "@/components/site-header";
import { FooterSection } from "@/components/sections/footer-section";

export default function AboutPage() {
  return <><SiteHeader/><main className="mx-auto max-w-6xl px-6 py-24 text-slate-900">
    <p className="text-xs uppercase tracking-[.2em] text-blue-700">About the platform</p>
    <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">Better collaborations start with better infrastructure.</h1>
    <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">We are building a platform that helps brands work with creators, influencers, UGC professionals and models through clearer briefs, structured collaboration and accountable campaign operations.</p>
    <div className="mt-16 grid gap-5 md:grid-cols-3">{[["For brands","A clearer way to brief, discover talent and coordinate campaigns."],["For creators","A professional place to present your work and find relevant opportunities."],["For every collaboration","Better-defined scope, timelines, deliverables and communication."]].map(([title,body])=><article key={title} className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-4 leading-7 text-slate-600">{body}</p></article>)}</div>
  </main><FooterSection/></>;
}