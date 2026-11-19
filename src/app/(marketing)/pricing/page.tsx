import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
export default function PricingPage() {
  return <><SiteHeader/><main className="mx-auto max-w-6xl px-6 py-24 text-white">
    <p className="text-xs uppercase tracking-[.2em] text-lime-300">Pricing</p>
    <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Straightforward pricing. No made-up promises.</h1>
    <p className="mt-6 max-w-2xl leading-8 text-zinc-400">Pricing is currently handled around each campaign&apos;s scope. We are not publishing fixed subscription or marketplace fees until the service and payment terms are finalized.</p>
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-8"><p className="text-sm text-lime-300">Managed campaigns</p><h2 className="mt-3 text-2xl font-semibold">Campaign support</h2><p className="mt-4 leading-7 text-zinc-400">Share your brief and requirements. The team can discuss creator sourcing, coordination and campaign execution.</p><Link href="/contact" className="mt-8 inline-block rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">Discuss a campaign</Link></section>
      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-8"><p className="text-sm text-lime-300">Platform access</p><h2 className="mt-3 text-2xl font-semibold">Join the network</h2><p className="mt-4 leading-7 text-zinc-400">Create a brand or creator account and prepare your profile while marketplace features are being developed.</p><Link href="/sign-up" className="mt-8 inline-block rounded-full border border-white/20 px-5 py-3 font-semibold">Create an account</Link></section>
    </div>
  </main></>;
}