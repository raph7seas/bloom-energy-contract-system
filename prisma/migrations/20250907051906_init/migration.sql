-- CreateEnum
CREATE TYPE "public"."system_type" AS ENUM ('POWER_PURCHASE_STANDARD', 'POWER_PURCHASE_WITH_BATTERY', 'MICROGRID_CONSTRAINED', 'MICROGRID_UNCONSTRAINED', 'PP', 'MG', 'AMG', 'OG');

-- CreateEnum
CREATE TYPE "public"."contract_status" AS ENUM ('ACTIVE', 'DRAFT', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."voltage_level" AS ENUM ('V_208', 'V_480', 'V_4_16K', 'V_13_2K', 'V_34_5K');

-- CreateEnum
CREATE TYPE "public"."component_type" AS ENUM ('RI', 'AC', 'UC', 'BESS', 'SOLAR', 'WIND');

-- CreateEnum
CREATE TYPE "public"."upload_status" AS ENUM ('UPLOADING', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."ai_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."rule_type" AS ENUM ('RANGE', 'ENUM', 'CORRELATION', 'VALIDATION', 'CALCULATION');

-- CreateTable
CREATE TABLE "public"."contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "term" INTEGER NOT NULL,
    "systemType" "public"."system_type" NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."contract_status" NOT NULL DEFAULT 'DRAFT',
    "totalValue" DOUBLE PRECISION,
    "yearlyRate" DOUBLE PRECISION,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."financial_parameters" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "microgridAdder" DOUBLE PRECISION,
    "escalation" DOUBLE PRECISION NOT NULL,
    "thermalCycleFee" DOUBLE PRECISION,
    "electricalBudget" DOUBLE PRECISION,
    "commissioningAllowance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technical_parameters" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "voltage" "public"."voltage_level" NOT NULL,
    "gridVoltage" "public"."voltage_level",
    "servers" INTEGER NOT NULL,
    "components" "public"."component_type"[],
    "recType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."operating_parameters" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "outputWarranty" DOUBLE PRECISION NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "minDemand" DOUBLE PRECISION NOT NULL,
    "maxDemand" DOUBLE PRECISION NOT NULL,
    "criticalOutput" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "formData" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."uploaded_files" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."upload_status" NOT NULL DEFAULT 'UPLOADING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "extractedData" JSONB,
    "filePath" TEXT,
    "uploadedBy" TEXT,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "public"."ai_role" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."learned_rules" (
    "id" TEXT NOT NULL,
    "ruleType" "public"."rule_type" NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleData" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learned_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_stats" (
    "id" TEXT NOT NULL,
    "totalContracts" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageContractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractsByStatus" JSONB NOT NULL DEFAULT '{}',
    "contractsByType" JSONB NOT NULL DEFAULT '{}',
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_TemplateContracts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TemplateContracts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_parameters_contractId_key" ON "public"."financial_parameters"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "technical_parameters_contractId_key" ON "public"."technical_parameters"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "operating_parameters_contractId_key" ON "public"."operating_parameters"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "learned_rules_ruleType_category_name_key" ON "public"."learned_rules"("ruleType", "category", "name");

-- CreateIndex
CREATE INDEX "_TemplateContracts_B_index" ON "public"."_TemplateContracts"("B");

-- AddForeignKey
ALTER TABLE "public"."financial_parameters" ADD CONSTRAINT "financial_parameters_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technical_parameters" ADD CONSTRAINT "technical_parameters_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."operating_parameters" ADD CONSTRAINT "operating_parameters_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uploaded_files" ADD CONSTRAINT "uploaded_files_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TemplateContracts" ADD CONSTRAINT "_TemplateContracts_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TemplateContracts" ADD CONSTRAINT "_TemplateContracts_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."contract_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
