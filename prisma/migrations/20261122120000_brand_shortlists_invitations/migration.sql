CREATE TABLE "BrandShortlistItem" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandShortlistItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BrandShortlistItem_brandId_creatorProfileId_key" ON "BrandShortlistItem"("brandId", "creatorProfileId");
CREATE INDEX "BrandShortlistItem_brandId_createdAt_idx" ON "BrandShortlistItem"("brandId", "createdAt");
ALTER TABLE "BrandShortlistItem" ADD CONSTRAINT "BrandShortlistItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandShortlistItem" ADD CONSTRAINT "BrandShortlistItem_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CampaignInvitation" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "proposedRate" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignInvitation_campaignId_creatorProfileId_key" ON "CampaignInvitation"("campaignId", "creatorProfileId");
CREATE INDEX "CampaignInvitation_creatorProfileId_status_createdAt_idx" ON "CampaignInvitation"("creatorProfileId", "status", "createdAt");
CREATE INDEX "CampaignInvitation_brandId_createdAt_idx" ON "CampaignInvitation"("brandId", "createdAt");
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
