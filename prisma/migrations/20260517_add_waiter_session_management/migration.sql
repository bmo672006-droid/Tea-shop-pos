-- AlterTable
ALTER TABLE "User" ADD COLUMN "pinOld" TEXT;
UPDATE "User" SET "pinOld" = "pin";

-- CreateTable
CREATE TABLE "WaiterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "waiterId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "lastSyncAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destroyedAt" DATETIME,
    "deviceName" TEXT,
    "deviceOS" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "WaiterSession_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX "WaiterSession_waiterId_idx" ON "WaiterSession"("waiterId");

-- CreateIndex
CREATE INDEX "WaiterSession_deviceId_idx" ON "WaiterSession"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "WaiterSession_pin_waiterId_key" ON "WaiterSession"("pin", "waiterId");

-- CreateIndex
CREATE UNIQUE INDEX "WaiterSession_waiterId_deviceId_key" ON "WaiterSession"("waiterId", "deviceId");

-- Add unique constraint to User.pin (already generated for existing users)
-- Note: SQLite doesn't support conditional unique constraints, so we'll need to ensure uniqueness in application logic
