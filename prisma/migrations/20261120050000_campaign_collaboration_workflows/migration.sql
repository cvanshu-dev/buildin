CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "objectives" TEXT[] NOT NULL,
  "categories" TEXT[] NOT NULL,
  "platforms" TEXT[] NOT NULL,
  "location" TEXT,
  "budgetMin" INTEGER,
  "budgetMax" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "slots" INTEGER NOT NULL DEFAULT 1,
  "applicationDeadline" TIMESTAMP(3),
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignApplication" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "pitch" TEXT NOT NULL,
  "proposedRate" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Collaboration" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "agreedAmount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CollaborationMessage" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Deliverable" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assetUrl" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "feedback" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CollaborationAgreement" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "terms" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationAgreement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CreatorProfile_isPublic_city_state_idx" ON "CreatorProfile"("isPublic", "city", "state");
CREATE INDEX "Campaign_status_createdAt_idx" ON "Campaign"("status", "createdAt");
CREATE INDEX "Campaign_brandId_status_idx" ON "Campaign"("brandId", "status");
CREATE UNIQUE INDEX "CampaignApplication_campaignId_creatorProfileId_key" ON "CampaignApplication"("campaignId", "creatorProfileId");
CREATE INDEX "CampaignApplication_campaignId_status_idx" ON "CampaignApplication"("campaignId", "status");
CREATE INDEX "CampaignApplication_creatorProfileId_status_idx" ON "CampaignApplication"("creatorProfileId", "status");
CREATE UNIQUE INDEX "Collaboration_applicationId_key" ON "Collaboration"("applicationId");
CREATE INDEX "Collaboration_creatorProfileId_status_idx" ON "Collaboration"("creatorProfileId", "status");
CREATE INDEX "Collaboration_campaignId_status_idx" ON "Collaboration"("campaignId", "status");
CREATE INDEX "CollaborationMessage_collaborationId_createdAt_idx" ON "CollaborationMessage"("collaborationId", "createdAt");
CREATE INDEX "Deliverable_collaborationId_status_idx" ON "Deliverable"("collaborationId", "status");
CREATE UNIQUE INDEX "CollaborationAgreement_collaborationId_key" ON "CollaborationAgreement"("collaborationId");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CampaignApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationMessage" ADD CONSTRAINT "CollaborationMessage_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationMessage" ADD CONSTRAINT "CollaborationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAgreement" ADD CONSTRAINT "CollaborationAgreement_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
