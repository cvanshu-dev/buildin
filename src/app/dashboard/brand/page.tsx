import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/current-user";
import {DashboardShell} from "@/components/dashboard-shell";
import {ProfileWorkspace} from "@/components/profile-workspace";
import Link from "next/link";
export default async function BrandDashboard(){const user=await getCurrentUser();if(!user||user.role!=="BRAND")redirect("/dashboard");return <DashboardShell title="Brand workspace" role="Brand"><div className="mt-5 flex gap-3"><Link className="rounded-full bg-lime-300 px-5 py-2 text-sm font-semibold text-black" href="/dashboard/brand/campaigns">Campaign management</Link></div><ProfileWorkspace type="BRAND"/></DashboardShell>;}
