import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const staffRoles = ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER", "FINANCE_MANAGER"] as const;

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only Super Admin can manage staff." }, { status: 403 });
  const staff = await prisma.user.findMany({
    where: { role: { in: [...staffRoles] } }, orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json({ staff });
}

const schema = z.object({ userId: z.string().min(1), role: z.enum(["BRAND", "CREATOR", "PENDING", ...staffRoles]) });

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only Super Admin can manage staff roles." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff role update." }, { status: 400 });
  if (parsed.data.userId === actor.id && parsed.data.role !== "SUPER_ADMIN") return NextResponse.json({ error: "You cannot remove your own Super Admin access." }, { status: 409 });
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, name: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "SUPER_ADMIN" && parsed.data.role !== "SUPER_ADMIN" && target.status === "ACTIVE") {
    const active = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (active <= 1) return NextResponse.json({ error: "The last active Super Admin cannot be demoted." }, { status: 409 });
  }
  if (target.role === parsed.data.role) return NextResponse.json({ user: target });
  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role }, select: { id: true, name: true, email: true, role: true, status: true } });
  await writeAuditLog({ actorId: actor.id, action: "STAFF_ROLE_CHANGED", entityType: "USER", entityId: target.id, metadata: { previousRole: target.role, nextRole: parsed.data.role } });
  return NextResponse.json({ user: updated });
}
