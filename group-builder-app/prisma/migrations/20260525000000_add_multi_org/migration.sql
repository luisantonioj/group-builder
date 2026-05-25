-- Multi-organization support migration
-- Adds Organization + OrgConfig models, links User and Batch to an org,
-- and backfills all existing data to the canonical BLD org.

-- 1. Create Organization table
CREATE TABLE "Organization" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "isBld"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- 2. Create OrgConfig table
CREATE TABLE "OrgConfig" (
  "id"               TEXT NOT NULL,
  "orgId"            TEXT NOT NULL,
  "termCandidate"    TEXT,
  "termGroup"        TEXT,
  "termBatch"        TEXT,
  "termShepherd"     TEXT,
  "termHeadShepherd" TEXT,
  "features"         JSONB NOT NULL DEFAULT '{}',
  "primaryColor"     TEXT,
  "logoUrl"          TEXT,
  CONSTRAINT "OrgConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrgConfig_orgId_key" ON "OrgConfig"("orgId");
ALTER TABLE "OrgConfig" ADD CONSTRAINT "OrgConfig_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Insert canonical BLD organization
INSERT INTO "Organization" ("id", "name", "slug", "isBld", "createdAt", "updatedAt")
VALUES ('org-bld', 'BLD Youth Ministry', 'bld-youth-ministry', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Insert BLD org config with full features and BLD terminology
INSERT INTO "OrgConfig" ("id", "orgId", "termCandidate", "termGroup", "termBatch", "termShepherd", "termHeadShepherd", "features")
VALUES (
  'orgcfg-bld',
  'org-bld',
  'Lamb',
  'Kordero',
  'YE Batch',
  'Shepherd',
  'Head Shepherd',
  '{"roomAssignment": true, "visualizer": true, "importExcel": true}'
);

-- 5. Add nullable orgId to User
ALTER TABLE "User" ADD COLUMN "orgId" TEXT;

-- 6. Add nullable orgId to Batch
ALTER TABLE "Batch" ADD COLUMN "orgId" TEXT;

-- 7. Backfill all existing users to BLD org
UPDATE "User" SET "orgId" = 'org-bld';

-- 8. Backfill all existing batches to BLD org
UPDATE "Batch" SET "orgId" = 'org-bld';

-- 9. Drop old unique constraint on User.email
DROP INDEX IF EXISTS "User_email_key";

-- 10. Add composite unique on (email, orgId)
CREATE UNIQUE INDEX "User_email_orgId_key" ON "User"("email", "orgId");

-- 11. Drop old unique constraint on Batch.name
DROP INDEX IF EXISTS "Batch_name_key";

-- 12. Add composite unique on (name, orgId)
CREATE UNIQUE INDEX "Batch_name_orgId_key" ON "Batch"("name", "orgId");

-- 13. Add indexes
CREATE INDEX "User_orgId_idx" ON "User"("orgId");
CREATE INDEX "Batch_orgId_idx" ON "Batch"("orgId");

-- 14. Add foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
