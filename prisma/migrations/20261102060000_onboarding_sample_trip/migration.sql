-- AlterTable
ALTER TABLE "User" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Everyone who already has an account has used the app; don't walk them
-- through the welcome.
UPDATE "User" SET "onboardedAt" = "createdAt";
