import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export function DashboardShell({ title, role, children }: { title: string; role: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-950 text-white">
    <header className="border-b border-white/10"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link href="/" className="font-semibold">MARKET<span className="text-lime-300">PLACE.</span></Link><div className="flex items-center gap-4"><span className="text-sm text-zinc-400">{role}</span><SignOutButton /></div></div></header>
    <main className="mx-auto max-w-7xl px-6 py-12"><p className="text-xs uppercase tracking-[.2em] text-lime-300">{role} workspace</p><h1 className="mt-3 text-4xl font-semibold">{title}</h1>{children}</main>
  </div>;
}
