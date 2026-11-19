import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { dashboardForRole } from "@/lib/roles";

export default async function DashboardRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  redirect(dashboardForRole(user.role));
}
