"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BriefcaseBusiness, Compass, FileText, LayoutDashboard, Mail, UserRound } from "lucide-react";
const links = [
  { href: "/dashboard/creator", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/creator/campaigns", label: "Discover", icon: Compass },
  { href: "/dashboard/creator/applications", label: "Applications", icon: FileText },
  { href: "/dashboard/creator/collaborations", label: "Collaborations", icon: BriefcaseBusiness },
  { href: "/dashboard/creator/invitations", label: "Invitations", icon: Mail },
  { href: "/dashboard/creator/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/creator/profile", label: "My profile", icon: UserRound },
];
export function CreatorWorkspaceNav() {
  const pathname = usePathname();
  return <nav aria-label="Creator workspace" className="mb-7 -mx-4 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:mx-0 sm:rounded-2xl sm:border sm:px-2">
    <div className="flex min-w-max gap-1 py-2">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
          <Icon size={16} strokeWidth={1.8}/><span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
