import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { label: "How it works", href: "/how-it-works" },
  { label: "For brands", href: "/for-brands" },
  { label: "For creators", href: "/for-creators" },
  { label: "Discover talent", href: "/discover" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-900 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Buildin home" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold tracking-tight text-white">b.</span>
          <span className="text-[21px] font-bold tracking-[-0.055em]">buildin</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {links.map(link => <Link key={link.href} href={link.href} className="text-[13px] font-medium text-slate-600 transition hover:text-blue-700">{link.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          {user ? <><Link href="/dashboard" className="text-sm font-semibold text-slate-700 hover:text-blue-700">Go to workspace</Link><SignOutButton /></> : <><Link href="/sign-in" className="text-sm font-semibold text-slate-700 hover:text-blue-700">Log in</Link><Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Get started <ArrowRight size={15}/></Link></>}
        </div>
        <details className="group relative md:hidden">
          <summary aria-label="Open navigation menu" className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 text-slate-700 [&::-webkit-details-marker]:hidden"><Menu size={19}/></summary>
          <div className="absolute right-0 top-14 w-[min(88vw,340px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
            {links.map(link=><Link key={link.href} href={link.href} className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
            <div className="my-2 border-t border-slate-100"/>
            {user ? <><Link href="/dashboard" className="block rounded-xl px-3 py-3 text-sm font-semibold text-blue-700">Go to workspace</Link><div className="px-3 py-2"><SignOutButton/></div></> : <><Link href="/sign-in" className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700">Log in</Link><Link href="/sign-up" className="mt-1 block rounded-xl bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white">Create an account</Link></>}
          </div>
        </details>
      </div>
    </header>
  );
}
