import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaffRole(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ campaign: { title: { contains: q, mode: "insensitive" as const } } }, { campaign: { brand: { name: { contains: q, mode: "insensitive" as const } } } }, { creatorProfile: { displayName: { contains: q, mode: "insensitive" as const } } }] } : {}),
    ...(actor.role === "CAMPAIGN_MANAGER" ? { campaign: { assignedManagerId: actor.id } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.collaboration.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20,
      select: { id: true, status: true, agreedAmount: true, updatedAt: true, campaign: { select: { id: true, title: true, managementMode: true, brand: { select: { name: true } } } }, creatorProfile: { select: { displayName: true, user: { select: { name: true, email: true } } } }, _count: { select: { deliverables: true, messages: true } }, deliverables: { select: { status: true } } },
    }),
    prisma.collaboration.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize: 20 });
}
