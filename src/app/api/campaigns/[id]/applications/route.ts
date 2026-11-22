import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const applySchema = z.object({
  pitch: z.string().trim().min(20).max(2000),
  proposedRate: z.number().int().min(0).optional().nullable(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const applications = await prisma.campaignApplication.findMany({
    where: { campaignId: id, campaign: { brand: { members: { some: { userId: user.id } } } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, pitch: true, proposedRate: true, status: true, createdAt: true,
      creatorProfile: {
        select: {
          id: true, displayName: true, city: true, state: true, categories: true, specialties: true,
          socialAccounts: { select: { platform: true, followers: true } },
        },
      },
    },
  });
  return NextResponse.json({ applications });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const { id } = await context.params;
  const parsed = applySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application." }, { status: 400 });
  }

  const [profile, campaign] = await Promise.all([
    prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true, isPublic: true } }),
    prisma.campaign.findFirst({
      where: {
        id, status: "PUBLISHED",
        OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: new Date() } }],
      },
      select: { id: true },
    }),
  ]);

  if (!profile?.isPublic) {
    return NextResponse.json({ error: "Publish your creator profile before applying." }, { status: 403 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Campaign is not accepting applications." }, { status: 404 });
  }

  try {
    const application = await prisma.campaignApplication.create({
      data: { campaignId: id, creatorProfileId: profile.id, ...parsed.data },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied to this campaign." }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });

  const { id } = await context.params;
  const schema = z.object({
    applicationId: z.string().min(1),
    decision: z.enum(["SHORTLISTED", "REJECTED", "ACCEPTED"]),
  });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });

  const app = await prisma.campaignApplication.findFirst({
    where: {
      id: parsed.data.applicationId,
      campaignId: id,
      campaign: { brand: { members: { some: { userId: user.id, title: "Owner" } } } },
    },
    include: { campaign: { select: { id: true, slots: true, status: true } } },
  });
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.status === "ACCEPTED") {
    return NextResponse.json({ error: "Accepted application cannot be changed here." }, { status: 409 });
  }
  if (app.status === "REJECTED") {
    return NextResponse.json({ error: "Rejected applications cannot be reopened." }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.campaignApplication.findUnique({
        where: { id: app.id },
        select: { status: true, campaignId: true, creatorProfileId: true },
      });
      if (!current || current.status === "ACCEPTED" || current.status === "REJECTED") {
        throw new Error("APPLICATION_NO_LONGER_ACTIONABLE");
      }

      if (parsed.data.decision === "ACCEPTED") {
        const campaign = await tx.campaign.findUnique({
          where: { id },
          select: { slots: true, status: true },
        });
        if (!campaign || campaign.status !== "PUBLISHED") {
          throw new Error("CAMPAIGN_NOT_ACCEPTING");
        }

        const acceptedCount = await tx.campaignApplication.count({
          where: { campaignId: id, status: "ACCEPTED" },
        });
        if (acceptedCount >= campaign.slots) {
          throw new Error("CAMPAIGN_FULL");
        }
      }

      const updated = await tx.campaignApplication.update({
        where: { id: app.id },
        data: { status: parsed.data.decision },
      });

      if (parsed.data.decision === "ACCEPTED") {
        const collaboration = await tx.collaboration.upsert({
          where: { applicationId: app.id },
          create: {
            applicationId: app.id,
            campaignId: id,
            creatorProfileId: current.creatorProfileId,
          },
          update: {},
        });
        return { application: updated, collaboration };
      }
      return { application: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CAMPAIGN_FULL") {
        return NextResponse.json({ error: "All creator slots for this campaign have been filled." }, { status: 409 });
      }
      if (error.message === "CAMPAIGN_NOT_ACCEPTING") {
        return NextResponse.json({ error: "This campaign is not accepting creator selections." }, { status: 409 });
      }
      if (error.message === "APPLICATION_NO_LONGER_ACTIONABLE") {
        return NextResponse.json({ error: "This application has already been decided." }, { status: 409 });
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Another application decision was processed at the same time. Please retry." }, { status: 409 });
    }
    throw error;
  }
}
