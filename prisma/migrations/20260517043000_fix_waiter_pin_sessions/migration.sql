-- Keep waiter PINs globally unique and allow a waiter to reuse the same PIN
-- after an old mobile session has been terminated.
DROP INDEX IF EXISTS "WaiterSession_pin_waiterId_key";

CREATE INDEX IF NOT EXISTS "WaiterSession_pin_idx" ON "WaiterSession"("pin");
CREATE UNIQUE INDEX IF NOT EXISTS "User_pin_key" ON "User"("pin");
