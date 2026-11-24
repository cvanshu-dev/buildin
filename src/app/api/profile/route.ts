import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { findOwnedVerifiedMedia, isCloudinarySecureUrl } from "@/lib/media-assets";

const text = (max: number) => z.string().trim().max(max).optional().nullable();

const creatorSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: text(1000),
  city: text(80),
  state: text(80),
  categories: z.array(z.string().trim().min(1).max(50)).max(12),
  specialties: z.array(z.string().trim().min(1).max(50)).max(12),
  languages: z.array(z.string().trim().min(1).max(40)).max(10),
  isPublic: z.boolean().optional(),
});

const brandSchema = z.object({
  logoUrl: z.string().url().max(2048).optional().nullable().or(z.literal("")),
  logoPublicId: z.string().min(1).max(240).optional(),
  name: z.string().trim().min(2).max(100),
  website: text(200),
  industry: text(80),
  description: text(1000),
  city: text(80),
  state: text(80),
  address: text(240),
  contactName: text(100),
  contactEmail: z.string().email().max(254).optional().nullable().or(z.literal("")),
  phone: text(30),
  gstin: text(15),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "CREATOR") {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: {
        portfolioItems: { orderBy: { sortOrder: "asc" } },
        socialAccounts: true,
        user: { select: { image: true } },
      },
    });

    return NextResponse.json({ type: "CREATOR", profile });
  }

  if (user.role === "BRAND") {
    const membership = await prisma.brandMember.findFirst({
      where: { userId: user.id },
      include: { brand: true },
    });

    return NextResponse.json({ type: "BRAND", profile: membership?.brand ?? null });
  }

  return NextResponse.json(
    { error: "This account cannot edit a marketplace profile." },
    { status: 403 },
  );
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (user.role === "CREATOR") {
    const parsed = creatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile." },
        { status: 400 },
      );
    }

    const { isPublic, ...profileData } = parsed.data;

    if (isPublic === true) {
      const existing = await prisma.creatorProfile.findUnique({
        where: { userId: user.id },
        select: {
          displayName: true,
          bio: true,
          city: true,
          state: true,
          categories: true,
          specialties: true,
          portfolioItems: { select: { id: true }, take: 1 },
          socialAccounts: { select: { id: true }, take: 1 },
        },
      });

      const hasCompleteProfile =
        Boolean(profileData.displayName?.trim()) &&
        Boolean(profileData.bio?.trim()) &&
        Boolean(profileData.city?.trim()) &&
        Boolean(profileData.state?.trim()) &&
        profileData.categories.length > 0 &&
        profileData.specialties.length > 0 &&
        Boolean(existing?.portfolioItems.length) &&
        Boolean(existing?.socialAccounts.length);

      if (!hasCompleteProfile) {
        return NextResponse.json(
          { error: "Complete all eight profile checklist items before publishing." },
          { status: 400 },
        );
      }
    }

    const profile = await prisma.creatorProfile.update({
      where: { userId: user.id },
      data: {
        ...profileData,
        bio: profileData.bio || null,
        ...(typeof isPublic === "boolean" ? { isPublic } : {}),
      },
    });

    return NextResponse.json({ ok: true, profile });
  }

  if (user.role === "BRAND") {
    const parsed = brandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile." },
        { status: 400 },
      );
    }

    const membership = await prisma.brandMember.findFirst({
      where: { userId: user.id, title: "Owner" },
      select: { brandId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only the brand owner can edit these details." },
        { status: 403 },
      );
    }

    const { logoPublicId, ...brandData } = parsed.data;
    if (logoPublicId || (brandData.logoUrl && isCloudinarySecureUrl(brandData.logoUrl))) {
      if (!logoPublicId || !brandData.logoUrl || !isCloudinarySecureUrl(brandData.logoUrl)) {
        return NextResponse.json({ error: "Select a verified brand logo upload." }, { status: 400 });
      }
      const asset = await findOwnedVerifiedMedia({
        ownerUserId: user.id,
        publicId: logoPublicId,
        context: "brand-logo",
        expectedPrefix: `buildin/brands/${membership.brandId}/logo/`,
      });
      if (!asset || asset.resourceType !== "image") {
        return NextResponse.json({ error: "This logo upload is not verified or does not belong to your brand." }, { status: 403 });
      }
    }

    const profile = await prisma.$transaction(async (tx) => {
      const updated = await tx.brand.update({
        where: { id: membership.brandId },
        data: {
          ...brandData,
          ...(brandData.logoUrl !== undefined ? { logoUrl: brandData.logoUrl || null } : {}),
          website: brandData.website || null,
          contactEmail: brandData.contactEmail || null,
        },
      });
      if (logoPublicId) {
        const linked = await tx.mediaAsset.updateMany({
          where: { ownerUserId: user.id, publicId: logoPublicId, linkedAt: null },
          data: { linkedAt: new Date() },
        });
        if (linked.count !== 1) throw new Error("MEDIA_LINK_CONFLICT");
      }
      return updated;
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "MEDIA_LINK_CONFLICT") return null;
      throw error;
    });

    if (!profile) return NextResponse.json({ error: "This logo upload has already been used. Upload it again." }, { status: 409 });
    return NextResponse.json({ ok: true, profile });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
