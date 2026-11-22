import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  role: z.enum(["PENDING", "BRAND", "CREATOR", "ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER", "FINANCE_MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user filters." }, { status: 400 });
  const { q, role, status, page } = parsed.data;
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
