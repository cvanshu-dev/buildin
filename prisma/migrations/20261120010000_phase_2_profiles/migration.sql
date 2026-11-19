CREATE TABLE "PortfolioItem" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "mediaUrl" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SocialAccount" (
  "id" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "profileUrl" TEXT NOT NULL,
  "followers" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VerificationRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "reviewNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PortfolioItem_creatorProfileId_sortOrder_idx" ON "PortfolioItem"("creatorProfileId","sortOrder");
CREATE UNIQUE INDEX "SocialAccount_creatorProfileId_platform_key" ON "SocialAccount"("creatorProfileId","platform");
CREATE INDEX "SocialAccount_creatorProfileId_idx" ON "SocialAccount"("creatorProfileId");
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status","createdAt");
CREATE INDEX "VerificationRequest_userId_createdAt_idx" ON "VerificationRequest"("userId","createdAt");
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
