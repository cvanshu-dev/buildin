import { SiteHeader } from "@/components/site-header";
const faqs = [
["Who can join?","Brands and creators can register. Creators can list modelling, UGC and other creative specialties in one creator profile."],
["How do managed campaigns work?","A brand shares a campaign brief. The team can help scope requirements and coordinate suitable talent. Detailed campaign workflows are being built."],
["Can creators apply to campaigns now?","Campaign discovery and applications are planned for a later product phase. Account registration and profile setup are available first."],
["Is creator verification available?","Verification workflows are planned for Phase 2. Do not treat an unverified profile or manually entered social metrics as verified."],
["How are payments handled?","Payment, commission, refunds and creator payout workflows are not yet live. No payment should be assumed due through this site."],
["Can I register as a model?","Yes. Register as a Creator and choose modelling as one of your specialties."]
];
export default function FAQPage(){return <><SiteHeader/><main className="mx-auto max-w-4xl px-6 py-24 text-white"><p className="text-xs uppercase tracking-[.2em] text-lime-300">FAQ</p><h1 className="mt-5 text-5xl font-semibold">Common questions.</h1><div className="mt-12 divide-y divide-white/10">{faqs.map(([q,a])=><section key={q} className="py-6"><h2 className="text-lg font-semibold">{q}</h2><p className="mt-3 leading-7 text-zinc-400">{a}</p></section>)}</div></main></>;}