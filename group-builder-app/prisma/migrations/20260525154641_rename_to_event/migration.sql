-- AlterTable
ALTER TABLE "Event" RENAME CONSTRAINT "Batch_pkey" TO "Event_pkey";

-- RenameForeignKey
ALTER TABLE "Candidate" RENAME CONSTRAINT "Candidate_batchId_fkey" TO "Candidate_eventId_fkey";

-- RenameForeignKey
ALTER TABLE "Event" RENAME CONSTRAINT "Batch_orgId_fkey" TO "Event_orgId_fkey";

-- RenameForeignKey
ALTER TABLE "Group" RENAME CONSTRAINT "Group_batchId_fkey" TO "Group_eventId_fkey";

-- RenameForeignKey
ALTER TABLE "Room" RENAME CONSTRAINT "Room_batchId_fkey" TO "Room_eventId_fkey";
