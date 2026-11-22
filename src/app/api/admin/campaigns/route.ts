import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaffRole(actor.role) || actor.role === "FINANCE_MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const status = url.searchParams.get("status") ?? "";
  const mode = url.searchParams.get("mode") ?? "";
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const where = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { brand: { name: { contains: q, mode: "insensitive" as const } } }] } : {}),
    ...(status ? { status } : {}),
    ...(mode ? { managementMode: mode } : {}),
    ...(actor.role === "CAMPAIGN_MANAGER" ? { assignedManagerId: actor.id } : {}),
  };
  const [items, total, managers] = await Promise.all([
    prisma.campaign.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20,
      select: { id: true, title: true, status: true, managementMode: true, budgetMin: true, budgetMax: true, slots: true, applicationDeadline: true, createdAt: true, updatedAt: true, assignedManagerId: true, assignedManager: { select: { id: true, name: true, email: true } }, brand: { select: { name: true } }, _count: { select: { applications: true, collaborations: true } } },
    }),
    prisma.campaign.count({ where }),
    ["ADMIN", "SUPER_ADMIN"].includes(actor.role) ? prisma.user.findMany({ where: { role: "CAMPAIGN_MANAGER", status: "ACTIVE" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [],
  ]);
  return NextResponse.json({ items, total, page, pageSize: 20, managers });
}
