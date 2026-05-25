-- Rename Batch table to Event
ALTER TABLE "Batch" RENAME TO "Event";

-- Add event-level feature flag columns
ALTER TABLE "Event" ADD COLUMN "featureVisualizer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "featureRoomAssignment" BOOLEAN NOT NULL DEFAULT false;

-- Rename FK columns on child tables
ALTER TABLE "Candidate" RENAME COLUMN "batchId" TO "eventId";
ALTER TABLE "Group" RENAME COLUMN "batchId" TO "eventId";
ALTER TABLE "Room" RENAME COLUMN "batchId" TO "eventId";

-- Rename OrgConfig terminology column
ALTER TABLE "OrgConfig" RENAME COLUMN "termBatch" TO "termEvent";

-- Rename indexes (adjust names if they differ in your DB)
ALTER INDEX IF EXISTS "Batch_orgId_idx" RENAME TO "Event_orgId_idx";
ALTER INDEX IF EXISTS "Batch_name_orgId_key" RENAME TO "Event_name_orgId_key";
ALTER INDEX IF EXISTS "Candidate_batchId_idx" RENAME TO "Candidate_eventId_idx";
ALTER INDEX IF EXISTS "Group_batchId_idx" RENAME TO "Group_eventId_idx";
ALTER INDEX IF EXISTS "Room_batchId_idx" RENAME TO "Room_eventId_idx";

-- Backfill BLD event with feature flags enabled
UPDATE "Event" SET "featureVisualizer" = true, "featureRoomAssignment" = true
WHERE "orgId" = 'org-bld';
