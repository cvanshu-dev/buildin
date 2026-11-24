ALTER TABLE "SocialAccount"
  ADD COLUMN "instagramUserId" TEXT,
  ADD COLUMN "accessTokenEncrypted" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "profilePictureUrl" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';

CREATE UNIQUE INDEX "SocialAccount_instagramUserId_key" ON "SocialAccount"("instagramUserId");

ALTER TABLE "PortfolioItem" ADD COLUMN "publicId" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN "resourceType" TEXT;

CREATE TABLE "CampaignBriefAttachment" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "resourceType" TEXT NOT NULL DEFAULT 'raw',
  "bytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignBriefAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CampaignBriefAttachment_campaignId_createdAt_idx" ON "CampaignBriefAttachment"("campaignId", "createdAt");
ALTER TABLE "CampaignBriefAttachment" ADD CONSTRAINT "CampaignBriefAttachment_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DeliverableSubmissionAttachment" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "resourceType" TEXT NOT NULL DEFAULT 'raw',
  "bytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliverableSubmissionAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeliverableSubmissionAttachment_submissionId_createdAt_idx" ON "DeliverableSubmissionAttachment"("submissionId", "createdAt");
ALTER TABLE "DeliverableSubmissionAttachment" ADD CONSTRAINT "DeliverableSubmissionAttachment_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "DeliverableSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "secureUrl" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "format" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "linkedAt" TIMESTAMP(3),
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
CREATE INDEX "MediaAsset_linkedAt_createdAt_idx" ON "MediaAsset"("linkedAt", "createdAt");
CREATE INDEX "MediaAsset_ownerUserId_context_idx" ON "MediaAsset"("ownerUserId", "context");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
