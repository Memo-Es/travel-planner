-- AlterTable: add trip-level currency
ALTER TABLE "Trip" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- AlterTable: add numeric cost column alongside the old free-text one
ALTER TABLE "TripItem" ADD COLUMN "costAmount" DOUBLE PRECISION;

-- Backfill: pull the numeric portion out of the old "€410"-style strings
UPDATE "TripItem"
SET "costAmount" = NULLIF(regexp_replace("cost", '[^0-9.]', '', 'g'), '')::DOUBLE PRECISION
WHERE "cost" IS NOT NULL AND "cost" != '';

-- AlterTable: drop the old free-text cost column now that it's migrated
ALTER TABLE "TripItem" DROP COLUMN "cost";
