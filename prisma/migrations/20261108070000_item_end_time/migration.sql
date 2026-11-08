-- A plan's time gets an optional finish alongside its start - nullable,
-- additive, no backfill: an existing plan simply has no end time until
-- someone sets one.

-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN "endTime" TEXT;
