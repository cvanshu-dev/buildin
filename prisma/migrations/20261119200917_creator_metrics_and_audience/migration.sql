-- CreateTable
CREATE TABLE "SocialAccountMetricSnapshot" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "averageLikes" INTEGER,
    "averageComments" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccountMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceInsight" (
    "id" TEXT NOT NULL,
    "metricSnapshotId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAccountMetricSnapshot_socialAccountId_recordedAt_idx" ON "SocialAccountMetricSnapshot"("socialAccountId", "recordedAt");

-- CreateIndex
CREATE INDEX "AudienceInsight_metricSnapshotId_category_idx" ON "AudienceInsight"("metricSnapshotId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceInsight_metricSnapshotId_category_label_key" ON "AudienceInsight"("metricSnapshotId", "category", "label");

-- AddForeignKey
ALTER TABLE "SocialAccountMetricSnapshot" ADD CONSTRAINT "SocialAccountMetricSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceInsight" ADD CONSTRAINT "AudienceInsight_metricSnapshotId_fkey" FOREIGN KEY ("metricSnapshotId") REFERENCES "SocialAccountMetricSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
