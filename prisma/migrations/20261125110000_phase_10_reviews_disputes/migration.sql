CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "reviewerRole" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetBrandId" TEXT,
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(100),
  "comment" VARCHAR(2000) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReviewReport" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" VARCHAR(1000),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CollaborationDispute" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" VARCHAR(4000) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolutionNote" VARCHAR(2000),
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationDispute_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DisputeEvidence" (
  "id" TEXT NOT NULL,
  "disputeId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'NOTE',
  "label" VARCHAR(140) NOT NULL,
  "content" TEXT,
  "url" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_collaborationId_reviewerRole_key" ON "Review"("collaborationId", "reviewerRole");
CREATE INDEX "Review_targetUserId_status_createdAt_idx" ON "Review"("targetUserId", "status", "createdAt");
CREATE INDEX "Review_targetBrandId_status_createdAt_idx" ON "Review"("targetBrandId", "status", "createdAt");
CREATE INDEX "Review_collaborationId_status_idx" ON "Review"("collaborationId", "status");
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");
CREATE INDEX "CollaborationDispute_status_createdAt_idx" ON "CollaborationDispute"("status", "createdAt");
CREATE INDEX "CollaborationDispute_collaborationId_createdAt_idx" ON "CollaborationDispute"("collaborationId", "createdAt");
CREATE INDEX "DisputeEvidence_disputeId_createdAt_idx" ON "DisputeEvidence"("disputeId", "createdAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetBrandId_fkey" FOREIGN KEY ("targetBrandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationDispute" ADD CONSTRAINT "CollaborationDispute_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationDispute" ADD CONSTRAINT "CollaborationDispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationDispute" ADD CONSTRAINT "CollaborationDispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "CollaborationDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
