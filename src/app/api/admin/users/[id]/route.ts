import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Only the administrator can change account status." }, { status: 403 });
  const { id } = await context.params;
  if (id === actor.id) return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid account status." }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true, name: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (["ADMIN", "SUPER_ADMIN"].includes(target.role) && parsed.data.status === "SUSPENDED" && target.status === "ACTIVE") {
    const active = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" } });
    if (active <= 1) return NextResponse.json({ error: "The last active administrator cannot be suspended." }, { status: 409 });
  }
  if (target.status === parsed.data.status) return NextResponse.json({ user: target });
  const updated = await prisma.user.update({ where: { id }, data: { status: parsed.data.status }, select: { id: true, name: true, email: true, role: true, status: true } });
  await writeAuditLog({ actorId: actor.id, action: parsed.data.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED", entityType: "USER", entityId: id, metadata: { previousStatus: target.status, nextStatus: parsed.data.status } });
  return NextResponse.json({ user: updated });
}
