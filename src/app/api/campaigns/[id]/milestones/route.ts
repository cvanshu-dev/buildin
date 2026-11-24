CREATE TYPE "CollaborationMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TABLE "CollaborationMilestone" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(1000),
  "dueAt" TIMESTAMP(3),
  "status" "CollaborationMilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationMilestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CollaborationMilestone_collaborationId_status_idx" ON "CollaborationMilestone"("collaborationId", "status");
CREATE INDEX "CollaborationMilestone_dueAt_status_idx" ON "CollaborationMilestone"("dueAt", "status");
ALTER TABLE "CollaborationMilestone" ADD CONSTRAINT "CollaborationMilestone_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ALTER COLUMN "status" SET DEFAULT 'PENDING_START';
UPDATE "Collaboration" SET "status" = 'ACTIVE' WHERE "status" = 'PENDING_START';
