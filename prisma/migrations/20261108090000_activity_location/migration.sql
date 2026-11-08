-- A plan can carry a real place - name, address and a Maps link - picked
-- from a Google Places search. Nullable, no backfill: an existing plan
-- simply has none until someone adds one.

-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN "location" TEXT;
ALTER TABLE "TripItem" ADD COLUMN "locationUrl" TEXT;

-- A human's own location search shares check_place's Places lookup and its
-- quota, but isn't "the agent checked a place" - tell the two apart so the
-- toast stays agent-only. Existing rows are all check_place calls, so they
-- default to "agent" rather than needing a backfill pass.

-- AlterTable
ALTER TABLE "PlacesCall" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'agent';
