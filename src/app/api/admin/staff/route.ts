import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const staffRoles = ["CAMPAIGN_MANAGER", "FINANCE_MANAGER"] as const;

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Only the administrator can manage operational staff." }, { status: 403 });
  const select = { id: true, name: true, email: true, role: true, status: true, createdAt: true } as const;
  const [staff, eligibleUsers] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: [...staffRoles] } }, orderBy: [{ role: "asc" }, { name: "asc" }], select }),
    prisma.user.findMany({ where: { role: "PENDING", status: "ACTIVE", creatorProfile: null, brandMemberships: { none: {} } }, orderBy: { name: "asc" }, take: 100, select }),
  ]);
  return NextResponse.json({ staff, eligibleUsers });
}

const schema = z.object({ userId: z.string().min(1), role: z.enum(["PENDING", ...staffRoles]) });

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Only the administrator can manage operational staff." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff role update." }, { status: 400 });
  if (parsed.data.userId === actor.id) return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 409 });
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, name: true, role: true, status: true, creatorProfile: { select: { id: true } }, brandMemberships: { select: { id: true } } } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (parsed.data.role !== "PENDING" && !staffRoles.includes(target.role as typeof staffRoles[number]) && (target.role !== "PENDING" || target.status !== "ACTIVE" || target.creatorProfile || target.brandMemberships.length > 0)) return NextResponse.json({ error: "Only active pending accounts without a marketplace profile or brand membership can be promoted to staff." }, { status: 409 });
  if (target.role === "SUPER_ADMIN" && target.status === "ACTIVE") {
    const active = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (active <= 1) return NextResponse.json({ error: "The last active Super Admin cannot be demoted." }, { status: 409 });
  }
  if (target.role === parsed.data.role) return NextResponse.json({ user: target });
  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role }, select: { id: true, name: true, email: true, role: true, status: true } });
  await writeAuditLog({ actorId: actor.id, action: "STAFF_ROLE_CHANGED", entityType: "USER", entityId: target.id, metadata: { previousRole: target.role, nextRole: parsed.data.role } });
  return NextResponse.json({ user: updated });
}
