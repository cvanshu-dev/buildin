import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { CreatorInvitations } from "@/components/creator-invitations";
export const dynamic="force-dynamic";
export default async function CreatorInvitationsPage(){const user=await getCurrentUser();if(!user||user.role!=="CREATOR")redirect("/dashboard");return <main className="min-h-screen bg-[#0b0d0e] px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><CreatorInvitations/></div></main>;}