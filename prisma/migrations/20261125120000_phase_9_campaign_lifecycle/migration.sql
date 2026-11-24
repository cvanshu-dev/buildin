CREATE TABLE "CollaborationMilestone" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationMilestone_pkey" PRIMARY KEY ("id")
);
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
CREATE INDEX "CollaborationMilestone_collaborationId_sortOrder_idx" ON "CollaborationMilestone"("collaborationId", "sortOrder");
CREATE INDEX "CollaborationMilestone_collaborationId_status_idx" ON "CollaborationMilestone"("collaborationId", "status");
CREATE INDEX "CollaborationEvent_collaborationId_createdAt_idx" ON "CollaborationEvent"("collaborationId", "createdAt");
ALTER TABLE "CollaborationMilestone" ADD CONSTRAINT "CollaborationMilestone_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationEvent" ADD CONSTRAINT "CollaborationEvent_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
