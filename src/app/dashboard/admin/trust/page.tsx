import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { AdminTrustDashboard } from "@/components/admin-trust-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminTrustPage() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) redirect("/dashboard/admin");
  return <div className="min-h-screen bg-[#080c0e]"><div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8"><Link href="/dashboard/admin" className="text-sm text-cyan-200 hover:underline">← Back to platform operations</Link></div><AdminTrustDashboard /></div>;
}
