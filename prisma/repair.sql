-- Run before every `prisma migrate deploy` by scripts/migrate.mjs.
--
-- On 6 Oct 2026 a preview build of feature/quien-pago ran its migration
-- against the production database, which previews were sharing, and it
-- failed. Prisma then refuses every later migration (P3009), so production
-- stopped deploying. This undoes whatever that attempt left behind and marks
-- it rolled back, which is what `prisma migrate resolve --rolled-back` does.
--
-- It only acts while that failed attempt is on record, so once the database
-- is clean it does nothing, and it never touches the columns if the
-- migration is later applied for real.
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM "_prisma_migrations"
      WHERE migration_name = '20261005120000_location_payer_shares'
        AND finished_at IS NULL
        AND rolled_back_at IS NULL
    ) THEN
      ALTER TABLE "TripItem" DROP CONSTRAINT IF EXISTS "TripItem_paidById_fkey";
      ALTER TABLE "TripItem" DROP COLUMN IF EXISTS "location";
      ALTER TABLE "TripItem" DROP COLUMN IF EXISTS "paidById";
      UPDATE "_prisma_migrations"
      SET rolled_back_at = now()
      WHERE migration_name = '20261005120000_location_payer_shares'
        AND finished_at IS NULL
        AND rolled_back_at IS NULL;
      RAISE NOTICE 'Cleared the failed 20261005120000_location_payer_shares migration';
    END IF;
  END IF;
END $$;
