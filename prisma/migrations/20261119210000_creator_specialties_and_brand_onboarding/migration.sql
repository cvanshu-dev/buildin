-- Move modelling into CreatorProfile and add the first onboarding fields.
ALTER TABLE "Brand" ADD COLUMN "city" TEXT;
ALTER TABLE "Brand" ADD COLUMN "state" TEXT;
ALTER TABLE "Brand" ADD COLUMN "address" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Brand" ADD COLUMN "phone" TEXT;
ALTER TABLE "Brand" ADD COLUMN "gstin" TEXT;

ALTER TABLE "CreatorProfile" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CreatorProfile" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DROP TABLE "ModelProfile";