import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaffRole(actor.role) || actor.role === "FINANCE_MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ campaign: { title: { contains: q, mode: "insensitive" as const } } }, { creatorProfile: { displayName: { contains: q, mode: "insensitive" as const } } }, { creatorProfile: { user: { email: { contains: q, mode: "insensitive" as const } } } }] } : {}),
    ...(actor.role === "CAMPAIGN_MANAGER" ? { campaign: { assignedManagerId: actor.id } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.campaignApplication.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20,
      select: { id: true, pitch: true, proposedRate: true, status: true, createdAt: true, campaign: { select: { id: true, title: true, status: true, slots: true, brand: { select: { name: true } } } }, creatorProfile: { select: { id: true, displayName: true, city: true, state: true, user: { select: { id: true, name: true, email: true } }, socialAccounts: { select: { platform: true, followers: true } } } } },
    }),
    prisma.campaignApplication.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize: 20 });
}

const schema = z.object({ applicationId: z.string().min(1), decision: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]) });

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid application decision." }, { status: 400 });
  const app = await prisma.campaignApplication.findUnique({
    where: { id: parsed.data.applicationId },
    include: { campaign: { select: { id: true, status: true, slots: true, assignedManagerId: true } }, creatorProfile: { select: { userId: true } } },
  });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (actor.role === "CAMPAIGN_MANAGER" && app.campaign.assignedManagerId !== actor.id) return NextResponse.json({ error: "This campaign is not assigned to you." }, { status: 403 });
  if (["ACCEPTED", "REJECTED"].includes(app.status)) return NextResponse.json({ error: "This application has already been decided." }, { status: 409 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.campaignApplication.findUnique({ where: { id: app.id }, select: { status: true, creatorProfileId: true } });
      if (!current || ["ACCEPTED", "REJECTED"].includes(current.status)) throw new Error("APPLICATION_DECIDED");
      if (parsed.data.decision === "ACCEPTED") {
        const campaign = await tx.campaign.findUnique({ where: { id: app.campaignId }, select: { status: true, slots: true } });
        if (!campaign || campaign.status !== "PUBLISHED") throw new Error("CAMPAIGN_NOT_OPEN");
        const count = await tx.campaignApplication.count({ where: { campaignId: app.campaignId, status: "ACCEPTED" } });
        if (count >= campaign.slots) throw new Error("CAMPAIGN_FULL");
      }
      const updated = await tx.campaignApplication.update({ where: { id: app.id }, data: { status: parsed.data.decision } });
      const collaboration = parsed.data.decision === "ACCEPTED"
        ? await tx.collaboration.upsert({ where: { applicationId: app.id }, create: { applicationId: app.id, campaignId: app.campaignId, creatorProfileId: current.creatorProfileId }, update: {} })
        : null;
      await tx.notification.create({ data: { userId: app.creatorProfile.userId, type: "APPLICATION_UPDATE", title: "Application update", body: `Your application was ${parsed.data.decision.toLowerCase()}.`, href: "/dashboard/creator" } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "APPLICATION_DECISION_CHANGED", entityType: "CAMPAIGN_APPLICATION", entityId: app.id, metadata: { previousStatus: current.status, nextStatus: parsed.data.decision } } });
      return { application: updated, collaboration };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "APPLICATION_DECIDED") return NextResponse.json({ error: "This application has already been decided." }, { status: 409 });
    if (error instanceof Error && error.message === "CAMPAIGN_NOT_OPEN") return NextResponse.json({ error: "Campaign is not accepting selections." }, { status: 409 });
    if (error instanceof Error && error.message === "CAMPAIGN_FULL") return NextResponse.json({ error: "All campaign slots are filled." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "A concurrent application update occurred. Retry." }, { status: 409 });
    throw error;
  }
}
