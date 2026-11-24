DROP TABLE IF EXISTS "PlatformInstagramConnection";
ALTER TABLE "SocialAccount" DROP COLUMN IF EXISTS "instagramUserId";
ALTER TABLE "SocialAccount" DROP COLUMN IF EXISTS "accessTokenEncrypted";
ALTER TABLE "SocialAccount" DROP COLUMN IF EXISTS "tokenExpiresAt";
