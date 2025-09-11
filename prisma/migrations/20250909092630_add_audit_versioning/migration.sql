/*
  Warnings:

  - You are about to drop the column `contractId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `recordId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `tableName` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userEmail` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `auditHash` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_contractId_fkey";

-- AlterTable
ALTER TABLE "public"."audit_logs" DROP COLUMN "contractId",
DROP COLUMN "recordId",
DROP COLUMN "tableName",
DROP COLUMN "userEmail",
ADD COLUMN     "auditHash" TEXT NOT NULL,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "oldValues" SET DATA TYPE TEXT,
ALTER COLUMN "newValues" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "public"."entity_versions" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "changeDescription" TEXT,
    "versionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "entity_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entity_versions_entityType_entityId_versionNumber_key" ON "public"."entity_versions"("entityType", "entityId", "versionNumber");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_versions" ADD CONSTRAINT "entity_versions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
