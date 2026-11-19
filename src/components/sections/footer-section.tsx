import Link from "next/link";
import { ArrowRight } from "lucide-react";

const footerLinks = {
  explore: [
    { label: "How it works", href: "/how-it-works" },
    { label: "For brands", href: "/for-brands" },
    { label: "For creators", href: "/for-creators" },
    { label: "Managed campaigns", href: "/managed-campaigns" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "/faq" },
  ],
  account: [
    { label: "Log in", href: "/sign-in" },
    { label: "Create account", href: "/sign-up" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy notice", href: "/privacy" },
    { label: "Terms of use", href: "/terms" },
  ],
};

export function FooterSection() {
  return <footer className="bg-[#101010] px-5 py-16 text-white sm:px-8 lg:px-12">
    <div className="mx-auto max-w-[1400px]">
      <div className="grid gap-12 border-b border-white/10 pb-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div><Link href="/" className="text-2xl font-black tracking-[-0.08em]">BRAND<span className="font-light text-neutral-500">/</span>STUDIO</Link><p className="mt-5 max-w-xs text-sm leading-7 text-neutral-500">A collaboration platform connecting brands with creators, influencers and creative opportunities.</p></div>
        <div><p className="text-[9px] tracking-[0.2em] text-neutral-500">EXPLORE</p><div className="mt-6 flex flex-col gap-4 text-sm text-neutral-300">{footerLinks.explore.map(link=><Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>)}</div></div>
        <div><p className="text-[9px] tracking-[0.2em] text-neutral-500">ACCOUNT & INFO</p><div className="mt-6 flex flex-col gap-4 text-sm text-neutral-300">{footerLinks.account.map(link=><Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>)}</div></div>
        <div><p className="text-[9px] tracking-[0.2em] text-neutral-500">GET IN TOUCH</p><p className="mt-6 text-sm text-neutral-300">Have a campaign or product question?</p><Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm text-white transition hover:text-neutral-400">Contact our team <ArrowRight size={14}/></Link></div>
      </div>
      <div className="flex flex-col justify-between gap-4 pt-7 text-[9px] tracking-[0.15em] text-neutral-600 sm:flex-row"><p>© {new Date().getFullYear()} BRAND/STUDIO. ALL RIGHTS RESERVED.</p><p>BUILT FOR BETTER COLLABORATIONS.</p></div>
    </div>
  </footer>;
}