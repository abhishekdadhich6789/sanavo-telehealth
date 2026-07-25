-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "serviceType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "patientName" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConsultRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_orderId_key" ON "PaymentOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_paymentId_key" ON "PaymentOrder"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_requestId_key" ON "PaymentOrder"("requestId");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nmcNumber" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);
INSERT INTO "new_User" ("active", "createdAt", "createdBy", "email", "id", "mustChangePassword", "name", "nmcNumber", "passwordHash", "phone", "role") SELECT "active", "createdAt", "createdBy", "email", "id", "mustChangePassword", "name", "nmcNumber", "passwordHash", "phone", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_nmcNumber_key" ON "User"("nmcNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ConsultRequest_type_status_idx" ON "ConsultRequest"("type", "status");

-- CreateIndex
CREATE INDEX "ConsultRequest_assignedDoctorId_status_idx" ON "ConsultRequest"("assignedDoctorId", "status");

-- CreateIndex
CREATE INDEX "ConsultRequest_status_createdAt_idx" ON "ConsultRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_requestId_createdAt_idx" ON "StatusHistory"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_requestId_createdAt_idx" ON "Notification"("requestId", "createdAt");
