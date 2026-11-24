ALTER TABLE "CollaborationAgreementVersion"
  ADD COLUMN "brandAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "brandAcceptedById" TEXT,
  ADD COLUMN "brandAcceptedName" TEXT,
  ADD COLUMN "brandAcceptedIp" TEXT,
  ADD COLUMN "brandAcceptedUserAgent" TEXT,
  ADD COLUMN "creatorAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "creatorAcceptedById" TEXT,
  ADD COLUMN "creatorAcceptedName" TEXT,
  ADD COLUMN "creatorAcceptedIp" TEXT,
  ADD COLUMN "creatorAcceptedUserAgent" TEXT;
