-- Move modelling data into CreatorProfile before removing the legacy model-only table.
ALTER TABLE "Brand" ADD COLUMN "city" TEXT;
ALTER TABLE "Brand" ADD COLUMN "state" TEXT;
ALTER TABLE "Brand" ADD COLUMN "address" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Brand" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Brand" ADD COLUMN "phone" TEXT;
ALTER TABLE "Brand" ADD COLUMN "gstin" TEXT;

ALTER TABLE "CreatorProfile" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CreatorProfile" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO "CreatorProfile" (
  "id", "userId", "displayName", "bio", "city", "state",
  "categories", "specialties", "languages", "createdAt", "updatedAt"
)
SELECT
  model."id", model."userId", model."displayName", model."bio", model."city", model."state",
  ARRAY[]::TEXT[], model."specialties", ARRAY[]::TEXT[], model."createdAt", model."updatedAt"
FROM "ModelProfile" AS model
ON CONFLICT ("userId") DO UPDATE SET
  "displayName" = COALESCE("CreatorProfile"."displayName", EXCLUDED."displayName"),
  "bio" = COALESCE("CreatorProfile"."bio", EXCLUDED."bio"),
  "city" = COALESCE("CreatorProfile"."city", EXCLUDED."city"),
  "state" = COALESCE("CreatorProfile"."state", EXCLUDED."state"),
  "specialties" = ARRAY(
    SELECT DISTINCT specialty
    FROM unnest("CreatorProfile"."specialties" || EXCLUDED."specialties") AS merged(specialty)
  );

UPDATE "User" SET "role" = 'CREATOR' WHERE "role" = 'MODEL';

DROP TABLE "ModelProfile";