-- Expense becomes its own table: a plan may carry zero, one or several
-- costs, and a cost doesn't always belong to a plan at all. Every existing
-- TripItem.costAmount is backfilled into one Expense row (titled after the
-- item it came from) before the two columns it lived in are dropped.

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidById" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_tripId_idx" ON "Expense"("tripId");

-- CreateIndex
CREATE INDEX "Expense_itemId_idx" ON "Expense"("itemId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one Expense per costed TripItem, carrying its title, cost and
-- payer forward. A generated cuid-shaped id, since nothing here can call
-- Prisma's id generator - 25 chars, "c" + 24 base32-ish characters, is
-- close enough to a real cuid to be indistinguishable in use and is never
-- compared against one.
INSERT INTO "Expense" ("id", "tripId", "itemId", "title", "amount", "paidById", "createdAt")
SELECT
  'c' || substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 24),
  "tripId",
  "id",
  "title",
  "costAmount",
  "paidById",
  CURRENT_TIMESTAMP
FROM "TripItem"
WHERE "costAmount" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "TripItem" DROP CONSTRAINT IF EXISTS "TripItem_paidById_fkey";

-- AlterTable
ALTER TABLE "TripItem" DROP COLUMN "costAmount",
                       DROP COLUMN "paidById";
