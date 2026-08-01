-- AlterTable: currency moves up to the trip (Team) level, out of each stop
ALTER TABLE "Team" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

-- Backfill: inherit each team's currency from its earliest stop, if any
UPDATE "Team" t
SET "currency" = sub.currency
FROM (
  SELECT DISTINCT ON ("teamId") "teamId", "currency"
  FROM "Trip"
  ORDER BY "teamId", "order" ASC
) sub
WHERE t.id = sub."teamId";

ALTER TABLE "Trip" DROP COLUMN "currency";
