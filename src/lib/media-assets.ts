import { prisma } from "@/lib/prisma";

type MediaContext = "avatar" | "brand-logo" | "portfolio" | "campaign-cover" | "campaign-brief" | "deliverable";

export async function findOwnedVerifiedMedia(input: {
  ownerUserId: string;
  publicId: string;
  context: MediaContext;
  expectedPrefix: string;
}) {
  if (!input.publicId.startsWith(input.expectedPrefix)) return null;

  return prisma.mediaAsset.findFirst({
    where: {
      ownerUserId: input.ownerUserId,
      publicId: input.publicId,
      context: input.context,
      secureUrl: { startsWith: "https://res.cloudinary.com/" },
      bytes: { gt: 0 },
      format: { not: "pending" },
    },
  });
}

export function isCloudinarySecureUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}
