-- CreateTable
CREATE TABLE "ItemAttendee" (
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAttendee_pkey" PRIMARY KEY ("itemId","userId")
);

-- CreateIndex
CREATE INDEX "ItemAttendee_userId_idx" ON "ItemAttendee"("userId");

-- AddForeignKey
ALTER TABLE "ItemAttendee" ADD CONSTRAINT "ItemAttendee_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAttendee" ADD CONSTRAINT "ItemAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
