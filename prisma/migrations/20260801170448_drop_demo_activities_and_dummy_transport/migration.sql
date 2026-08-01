-- One-time cleanup: the seed data used to include an Activities section and
-- placeholder transport entries with no link or cost. Both are gone from
-- the seed going forward; this removes the ones already created for
-- existing accounts.
DELETE FROM "TripItem" WHERE "section" = 'ACTIVITIES';

DELETE FROM "TripItem"
WHERE "section" = 'TRANSPORT' AND "url" = '' AND "costAmount" IS NULL;
