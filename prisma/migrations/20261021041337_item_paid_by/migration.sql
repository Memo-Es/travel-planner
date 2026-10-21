-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN     "paidById" TEXT;

-- AddForeignKey
ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
