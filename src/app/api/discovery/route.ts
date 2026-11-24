import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 80);
  const city = params.get("city")?.trim().slice(0, 80);
  const category = params.get("category")?.trim().slice(0, 50);
  const specialty = params.get("specialty")?.trim().slice(0, 50);
  const platform = params.get("platform")?.trim().slice(0, 30);
  const page = boundedInteger(params.get("page"), 1, 1, 1000);
  const pageSize = boundedInteger(params.get("pageSize"), 12, 1, 30);

  const where = {
    isPublic: true,
    ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
    ...(category ? { categories: { has: category } } : {}),
    ...(specialty ? { specialties: { has: specialty } } : {}),
    ...(q ? {
      OR: [
        { displayName: { contains: q, mode: "insensitive" as const } },
        { bio: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(platform ? { socialAccounts: { some: { platform } } } : {}),
  };

  const [total, creators] = await prisma.$transaction([
    prisma.creatorProfile.count({ where }),
    prisma.creatorProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        user: { select: { id: true } },
        displayName: true,
        bio: true,
        city: true,
        state: true,
        categories: true,
        specialties: true,
        languages: true,
        portfolioItems: {
          take: 3,
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, mediaUrl: true, mediaType: true },
        },
        socialAccounts: {
          select: { platform: true, handle: true, followers: true },
        },
      },
    }),
  ]);

  const creatorUserIds = creators.map(creator => creator.user.id);
  const ratings = creatorUserIds.length ? await prisma.review.groupBy({
    by: ["targetUserId"], where: { targetUserId: { in: creatorUserIds }, status: "PUBLISHED" },
    _avg: { rating: true }, _count: { _all: true },
  }) : [];
  const ratingByUser = new Map(ratings.map(item => [item.targetUserId, { rating: item._avg.rating ? Number(item._avg.rating.toFixed(1)) : null, reviewCount: item._count._all }]));
  return NextResponse.json({
    creators: creators.map(({ user, ...creator }) => ({ ...creator, ...(ratingByUser.get(user.id) ?? { rating: null, reviewCount: 0 }) })),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  });
}
