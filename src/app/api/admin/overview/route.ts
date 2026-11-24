import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaffRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const managerScope = user.role === "CAMPAIGN_MANAGER" ? { assignedManagerId: user.id } : {};
  const campaignScope = managerScope;
  const applicationScope = user.role === "CAMPAIGN_MANAGER" ? { campaign: managerScope } : {};
  const collaborationScope = user.role === "CAMPAIGN_MANAGER" ? { campaign: managerScope } : {};
  const deliverableScope = user.role === "CAMPAIGN_MANAGER" ? { collaboration: { campaign: managerScope } } : {};

  const canViewTrustMetrics = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  const [
    users, activeUsers, suspendedUsers, brands, creators, campaigns, applications, collaborations, pendingVerifications,
    pendingDisputes, pendingReviewReports, recentUsers, recentCampaigns, recentCollaborations, recentAudit, deliverables, committed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.brand.count(), prisma.creatorProfile.count(),
    prisma.campaign.groupBy({ by: ["status"], where: campaignScope, _count: { _all: true } }),
    prisma.campaignApplication.groupBy({ by: ["status"], where: applicationScope, _count: { _all: true } }),
    prisma.collaboration.groupBy({ by: ["status"], where: collaborationScope, _count: { _all: true } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    canViewTrustMetrics ? prisma.collaborationDispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }) : 0,
    canViewTrustMetrics ? prisma.reviewReport.count({ where: { status: "PENDING" } }) : 0,
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } }),
    prisma.campaign.findMany({ where: campaignScope, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, status: true, managementMode: true, createdAt: true, brand: { select: { name: true } }, _count: { select: { applications: true } } } }),
    prisma.collaboration.findMany({ where: collaborationScope, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, status: true, agreedAmount: true, updatedAt: true, campaign: { select: { title: true, brand: { select: { name: true } } } }, creatorProfile: { select: { displayName: true } }, _count: { select: { deliverables: true, messages: true } } } }),
    canViewTrustMetrics ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true, email: true } } } }) : [],
    prisma.deliverable.groupBy({ by: ["status"], where: deliverableScope, _count: { _all: true } }),
    prisma.collaboration.aggregate({ where: collaborationScope, _sum: { agreedAmount: true } }),
  ]);
  const counts = (rows: { status: string; _count: { _all: number } }[]) => Object.fromEntries(rows.map(row => [row.status, row._count._all]));
  const financeOnly = user.role === "FINANCE_MANAGER";
  return NextResponse.json({
    metrics: { users, activeUsers, suspendedUsers, brands, creators, pendingVerifications, pendingDisputes, pendingReviewReports, committedAmount: committed._sum.agreedAmount ?? 0 },
    campaignCounts: counts(campaigns), applicationCounts: counts(applications), collaborationCounts: counts(collaborations), deliverableCounts: counts(deliverables),
    recentUsers: financeOnly ? [] : recentUsers,
    recentCampaigns: financeOnly ? [] : recentCampaigns,
    recentCollaborations,
    recentAudit: ["ADMIN", "SUPER_ADMIN"].includes(user.role) ? recentAudit : [],
    permissions: {
      canManageUsers: ["ADMIN", "SUPER_ADMIN"].includes(user.role),
      canManageCampaigns: ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(user.role),
      canReviewVerification: ["ADMIN", "SUPER_ADMIN"].includes(user.role),
      canViewAudit: ["ADMIN", "SUPER_ADMIN"].includes(user.role),
      canViewUsers: ["ADMIN", "SUPER_ADMIN"].includes(user.role),
    },
  });
}
