-- Before creating the public demo was serialized, visitors arriving
-- together could each create one. Keep the oldest and remove the rest;
-- their stops, plans and memberships go with them (ON DELETE CASCADE).
DELETE FROM "Team"
WHERE "isPublicDemo"
  AND "id" <> (
    SELECT "id" FROM "Team"
    WHERE "isPublicDemo"
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  );

-- The pretend travel buddies those duplicates had, now in no trip at all.
DELETE FROM "User" u
WHERE u."isSample"
  AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."userId" = u."id");
