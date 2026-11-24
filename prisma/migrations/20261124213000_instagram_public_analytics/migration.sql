ALTER TABLE "SocialAccount" ADD COLUMN IF NOT EXISTS "following" INTEGER;
ALTER TABLE "SocialAccountMetricSnapshot" ADD COLUMN IF NOT EXISTS "followingCount" INTEGER;
ALTER TABLE "SocialAccountMetricSnapshot" ADD COLUMN IF NOT EXISTS "postsAnalyzed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SocialAccountMetricSnapshot" ADD COLUMN IF NOT EXISTS "recentPosts" JSONB;
