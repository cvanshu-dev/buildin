import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const applySchema = z.object({ pitch: z.string().trim().min(20).max(2000), proposedRate: z.number().int().min(0).optional().nullable() });
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (user.role !== "BRAND") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const applications = await prisma.campaignApplication.findMany({
    where: { campaignId: id, campaign: { brand: { members: { some: { userId: user.id } } } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, pitch: true, proposedRate: true, status: true, createdAt: true, creatorProfile: { select: { id: true, displayName: true, city: true, state: true, categories: true, specialties: true, socialAccounts: { select: { platform: true, followers: true } } } } },
  });
  return NextResponse.json({ applications });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });
  const { id } = await context.params;
  const parsed = applySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application." }, { status: 400 });
  const [profile, campaign] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true, isPublic: true } }),
    prisma.campaign.findFirst({ where: { id, status: "PUBLISHED", OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: new Date() } }] }, select: { id: true } }),
  ]);
  if (!profile?.isPublic) return NextResponse.json({ error: "Publish your creator profile before applying." }, { status: 403 });
  if (!campaign) return NextResponse.json({ error: "Campaign is not accepting applications." }, { status: 404 });
  const existing = await prisma.campaignApplication.findUnique({ where: { campaignId_creatorProfileId: { campaignId: id, creatorProfileId: profile.id } } });
  if (existing) return NextResponse.json({ error: "You have already applied to this campaign." }, { status: 409 });
  const application = await prisma.campaignApplication.create({ data: { campaignId: id, creatorProfileId: profile.id, ...parsed.data } });
  return NextResponse.json({ application }, { status: 201 });
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const schema = z.object({ applicationId: z.string().min(1), decision: z.enum(["SHORTLISTED", "REJECTED", "ACCEPTED"]) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const app = await prisma.campaignApplication.findFirst({ where: { id: parsed.data.applicationId, campaignId: id, campaign: { brand: { members: { some: { userId: user.id, title: "Owner" } } } } }, include: { campaign: true } });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.status === "ACCEPTED") return NextResponse.json({ error: "Accepted application cannot be changed here." }, { status: 409 });
  const result = await prisma.$transaction(async tx => {
    const updated = await tx.campaignApplication.update({ where: { id: app.id }, data: { status: parsed.data.decision } });
    if (parsed.data.decision === "ACCEPTED") {
      const collaboration = await tx.collaboration.upsert({
        where: { applicationId: app.id },
        create: { applicationId: app.id, campaignId: id, creatorProfileId: app.creatorProfileId },
        update: {},
      });
      return { application: updated, collaboration };
    }
    return { application: updated };
  });
  return NextResponse.json(result);
}
