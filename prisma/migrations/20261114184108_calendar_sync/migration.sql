-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "icsToken" TEXT NOT NULL,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "googleCalendarId" TEXT,
    "googleTimeZone" TEXT,
    "googleSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedEvent" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_userId_key" ON "CalendarSync"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_icsToken_key" ON "CalendarSync"("icsToken");

-- CreateIndex
CREATE INDEX "SyncedEvent_itemId_idx" ON "SyncedEvent"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedEvent_syncId_itemId_key" ON "SyncedEvent"("syncId", "itemId");

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedEvent" ADD CONSTRAINT "SyncedEvent_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "CalendarSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedEvent" ADD CONSTRAINT "SyncedEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TripItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
