-- Upgrade the milestone table created by 20261125100000_phase_9_campaign_lifecycle.
-- Keep existing milestone rows and the original creator/completion audit fields.
ALTER TABLE "CollaborationMilestone" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CollaborationMilestone" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
UPDATE "CollaborationMilestone" SET "status" = 'APPROVED' WHERE "status" = 'COMPLETED';
ALTER TABLE "CollaborationMilestone" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "CollaborationMilestone"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "feedback" TEXT;
DROP TYPE "CollaborationMilestoneStatus";
CREATE INDEX "CollaborationMilestone_collaborationId_sortOrder_idx" ON "CollaborationMilestone"("collaborationId", "sortOrder");

CREATE TABLE "CollaborationEvent" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CollaborationEvent_collaborationId_createdAt_idx" ON "CollaborationEvent"("collaborationId", "createdAt");
ALTER TABLE "CollaborationEvent" ADD CONSTRAINT "CollaborationEvent_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
