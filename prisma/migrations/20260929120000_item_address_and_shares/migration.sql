-- AlterTable
ALTER TABLE "TripItem" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ItemShare" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ItemShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemShare_userId_idx" ON "ItemShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemShare_itemId_userId_key" ON "ItemShare"("itemId", "userId");

-- AddForeignKey
ALTER TABLE "ItemShare" ADD CONSTRAINT "ItemShare_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemShare" ADD CONSTRAINT "ItemShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
