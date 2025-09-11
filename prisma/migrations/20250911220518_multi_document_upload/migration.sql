-- CreateEnum
CREATE TYPE "public"."document_type" AS ENUM ('PRIMARY', 'APPENDIX', 'AMENDMENT', 'EXHIBIT', 'ADDENDUM', 'SIGNATURE', 'COVER_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."processing_status" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING');

-- CreateEnum
CREATE TYPE "public"."processing_job_type" AS ENUM ('CHUNK_UPLOAD', 'TEXT_EXTRACTION', 'PAGE_ANALYSIS', 'DOCUMENT_MERGE', 'OCR_PROCESSING', 'CONTENT_INDEXING', 'RULE_EXTRACTION', 'DOCUMENT_VALIDATION');

-- CreateTable
CREATE TABLE "public"."contract_documents" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "documentType" "public"."document_type" NOT NULL DEFAULT 'PRIMARY',
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "parentDocumentId" TEXT,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT,
    "uploadStatus" "public"."processing_status" NOT NULL DEFAULT 'UPLOADING',
    "processingStatus" "public"."processing_status" NOT NULL DEFAULT 'PENDING',
    "uploadProgress" INTEGER NOT NULL DEFAULT 0,
    "processingProgress" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER,
    "wordCount" INTEGER,
    "totalChunks" INTEGER,
    "chunksUploaded" INTEGER NOT NULL DEFAULT 0,
    "extractionStarted" TIMESTAMP(3),
    "extractionCompleted" TIMESTAMP(3),
    "errorMessage" TEXT,
    "processingMetadata" JSONB,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_pages" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "extractedText" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "wordCount" INTEGER,
    "characterCount" INTEGER,
    "ocrProvider" TEXT,
    "processingTime" INTEGER,
    "extractionMethod" TEXT,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "rotation" INTEGER DEFAULT 0,
    "hasTable" BOOLEAN NOT NULL DEFAULT false,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "hasSignature" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT DEFAULT 'en',
    "metadata" JSONB,
    "processingStatus" "public"."processing_status" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkNumber" INTEGER NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "chunkHash" TEXT NOT NULL,
    "uploadStatus" "public"."processing_status" NOT NULL DEFAULT 'PENDING',
    "tempFilePath" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processing_jobs" (
    "id" TEXT NOT NULL,
    "jobType" "public"."processing_job_type" NOT NULL,
    "status" "public"."processing_status" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "jobConfig" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER,
    "currentStep" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_pages_documentId_pageNumber_key" ON "public"."document_pages"("documentId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_documentId_chunkNumber_key" ON "public"."document_chunks"("documentId", "chunkNumber");

-- AddForeignKey
ALTER TABLE "public"."contract_documents" ADD CONSTRAINT "contract_documents_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contract_documents" ADD CONSTRAINT "contract_documents_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "public"."contract_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_pages" ADD CONSTRAINT "document_pages_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
