import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BrandDashboard } from "@/components/brand-dashboard";
import { BrandReviewsPanel } from "@/components/brand-reviews-panel";

export const dynamic = "force-dynamic";

export default async function BrandDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "BRAND") redirect("/dashboard");
  const owner = await prisma.brandMember.findFirst({
    where: { userId: user.id, title: "Owner" },
    include: { brand: { select: { id: true, name: true, logoUrl: true } } },
  });
  if (!owner) redirect("/onboarding");
  return <><BrandDashboard brandName={owner.brand.name} brandLogo={owner.brand.logoUrl} /><div className="mx-auto max-w-7xl px-4 pb-10 sm:px-8"><BrandReviewsPanel brandId={owner.brand.id}/></div></>;
}
