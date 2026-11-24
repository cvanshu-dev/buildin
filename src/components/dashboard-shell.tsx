import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { CreatorWorkspaceNav } from "@/components/creator-workspace-nav";
export function DashboardShell({ title, role, children }: { title: string; role: string; children: React.ReactNode }) {
  const isCreator = role.toUpperCase() === "CREATOR";
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">b.</span><span className="font-bold tracking-tight">buildin</span></Link>
        <div className="flex items-center gap-3"><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">{role.replaceAll("_"," ")}</span><SignOutButton/></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {!isCreator && <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-blue-700"><ArrowLeft size={14}/> Back to Buildin</Link>}
      <div className="mb-6 mt-2 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-700">{role.replaceAll("_"," ")} workspace</p><h1 className="mt-1.5 text-2xl font-bold tracking-[-.04em] sm:text-3xl">{title}</h1></div><div className="hidden size-10 place-items-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200 sm:grid"><LayoutDashboard size={19}/></div></div>
      {isCreator && <CreatorWorkspaceNav/>}
      {children}
    </main>
  </div>;
}
