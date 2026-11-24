ALTER TABLE "CollaborationMessage"
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "editedAt" TIMESTAMP(3);

CREATE INDEX "CollaborationMessage_collaborationId_readAt_idx"
ON "CollaborationMessage"("collaborationId", "readAt");
