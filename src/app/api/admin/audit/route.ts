import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const entityType = url.searchParams.get("entityType") ?? "";
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const where = {
    ...(entityType ? { entityType } : {}),
    ...(q ? { OR: [{ action: { contains: q, mode: "insensitive" as const } }, { entityId: { contains: q, mode: "insensitive" as const } }, { actor: { email: { contains: q, mode: "insensitive" as const } } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30, include: { actor: { select: { name: true, email: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize: 30 });
}
