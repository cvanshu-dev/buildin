-- Remove deferred Instagram analytics storage while preserving creator social usernames.
DROP TABLE IF EXISTS "AudienceInsight";
DROP TABLE IF EXISTS "SocialAccountMetricSnapshot";
ALTER TABLE "SocialAccount" DROP COLUMN IF EXISTS "following";
ALTER TABLE "SocialAccount" DROP COLUMN IF EXISTS "profilePictureUrl";
