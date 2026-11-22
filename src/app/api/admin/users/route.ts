import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaffRole(actor.role) || actor.role === "FINANCE_MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const role = url.searchParams.get("role") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(role ? { role } : {}), ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 25, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, creatorProfile: { select: { displayName: true, city: true, state: true } }, brandMemberships: { select: { brand: { select: { name: true } }, title: true } } } }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize: 25 });
}
