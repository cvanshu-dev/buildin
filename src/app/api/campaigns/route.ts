import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().trim().min(4).max(120),
  brief: z.string().trim().min(30).max(5000),
  objectives: z.array(z.string().trim().min(2).max(100)).max(10).default([]),
  categories: z.array(z.string().trim().min(1).max(50)).min(1).max(12),
  platforms: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  location: z.string().trim().max(100).optional().nullable(),
  budgetMin: z.number().int().min(0).optional().nullable(),
  budgetMax: z.number().int().min(0).optional().nullable(),
  slots: z.number().int().min(1).max(100).default(1),
  applicationDeadline: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
}).refine(v => v.budgetMin == null || v.budgetMax == null || v.budgetMax >= v.budgetMin, "Maximum budget must be greater than minimum.");

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "CREATOR") {
    const campaigns = await prisma.campaign.findMany({
      where: { status: "PUBLISHED", OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: new Date() } }] },
      orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, title: true, brief: true, objectives: true, categories: true, platforms: true, location: true, budgetMin: true, budgetMax: true, currency: true, slots: true, applicationDeadline: true, startDate: true, endDate: true, brand: { select: { name: true, industry: true, city: true, state: true } } },
    });
    return NextResponse.json({ campaigns });
  }
  if (user.role !== "BRAND") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const membership = await prisma.brandMember.findFirst({ where: { userId: user.id }, select: { brandId: true } });
  if (!membership) return NextResponse.json({ campaigns: [] });
  const campaigns = await prisma.campaign.findMany({ where: { brandId: membership.brandId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { applications: true } } } });
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign." }, { status: 400 });
  const membership = await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } });
  if (!membership) return NextResponse.json({ error: "Only a brand owner can create campaigns." }, { status: 403 });
  const data = parsed.data;
  const campaign = await prisma.campaign.create({ data: {
    ...data, brandId: membership.brandId,
    applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
  } });
  return NextResponse.json({ campaign }, { status: 201 });
}
