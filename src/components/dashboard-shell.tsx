import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export function DashboardShell({ title, role, children }: { title: string; role: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">b.</span><span className="font-bold tracking-tight">buildin</span></Link>
        <div className="flex items-center gap-3"><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">{role.replaceAll("_"," ")}</span><SignOutButton/></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-blue-700"><ArrowLeft size={14}/> Back to Buildin</Link>
      <div className="mb-8 mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">{role.replaceAll("_"," ")} workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">{title}</h1></div><div className="hidden size-11 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 sm:grid"><LayoutDashboard size={20}/></div></div>
      {children}
    </main>
  </div>;
}
