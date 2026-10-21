-- CreateTable
CREATE TABLE "PlacesCall" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacesCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacesCall_teamId_createdAt_idx" ON "PlacesCall"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlacesCall" ADD CONSTRAINT "PlacesCall_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
