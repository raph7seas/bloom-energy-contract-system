import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { fileAuditMiddleware } from '../middleware/audit.js';
import documentProcessingService from '../services/documentProcessingService.js';

const router = express.Router();

// Configure multer for chunked uploads (memory storage for chunks)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 50 // Maximum 50 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  }
});

// Initialize chunked upload for large files
router.post('/contracts/:contractId/upload/init', optionalAuth, fileAuditMiddleware, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { 
      originalName, 
      fileSize, 
      fileType, 
      documentType = 'PRIMARY',
      title,
      sequenceOrder = 0,
      parentDocumentId 
    } = req.body;

    // Validate contract exists
    const contract = await req.prisma.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Validate file info
    const validationErrors = documentProcessingService.validateFile(
      { originalname: originalName, mimetype: fileType }, 
      parseInt(fileSize)
    );
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'File validation failed', 
        details: validationErrors 
      });
    }

    // Initialize chunked upload
    const uploadSession = await documentProcessingService.initializeChunkedUpload(
      contractId,
      {
        originalName,
        fileSize: parseInt(fileSize),
        fileType,
        documentType,
        title: title || originalName,
        sequenceOrder: parseInt(sequenceOrder),
        parentDocumentId,
        uploadedBy: req.user?.id
      },
      req.prisma
    );

    res.status(201).json({
      message: 'Chunked upload initialized',
      uploadSession
    });

  } catch (error) {
    console.error('Initialize chunked upload error:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Upload chunk
router.post('/upload/:documentId/chunk/:chunkNumber', optionalAuth, upload.single('chunk'), async (req, res) => {
  try {
    const { documentId, chunkNumber } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No chunk data provided' });
    }

    const result = await documentProcessingService.processChunk(
      documentId,
      chunkNumber,
      req.file.buffer,
      req.prisma
    );

    res.json({
      message: 'Chunk uploaded successfully',
      ...result
    });

  } catch (error) {
    console.error('Upload chunk error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Upload multiple documents for a contract (enhanced version)
router.post('/contracts/:contractId/upload/multiple', optionalAuth, upload.array('documents', 50), fileAuditMiddleware, async (req, res) => {
  try {
    const { contractId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Validate contract exists
    const contract = await req.prisma.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const results = [];
    const errors = [];

    // Parse document metadata if provided
    const documentsMetadata = req.body.documentsMetadata ? 
      JSON.parse(req.body.documentsMetadata) : {};

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const metadata = documentsMetadata[i] || {};
      
      try {
        // Validate file
        const validationErrors = documentProcessingService.validateFile(file, file.size);
        if (validationErrors.length > 0) {
          errors.push({
            file: file.originalname,
            errors: validationErrors
          });
          continue;
        }

        // For files under 5MB, process directly without chunking
        if (file.size <= 5 * 1024 * 1024) {
          const fileName = documentProcessingService.generateDocumentFilename(
            file.originalname, 
            contractId, 
            metadata.documentType || 'PRIMARY'
          );

          // Save file directly
          const filePath = await documentProcessingService.saveFile(file.buffer, fileName);

          // Create document record
          const document = await req.prisma.contractDocument.create({
            data: {
              contractId,
              documentType: metadata.documentType || 'PRIMARY',
              sequenceOrder: metadata.sequenceOrder || i,
              parentDocumentId: metadata.parentDocumentId || null,
              title: metadata.title || file.originalname,
              fileName,
              originalName: file.originalname,
              fileSize: file.size,
              fileType: file.mimetype,
              filePath,
              uploadStatus: 'COMPLETED',
              processingStatus: 'PENDING',
              uploadProgress: 100,
              uploadedBy: req.user?.id
            }
          });

          // Queue text extraction
          await documentProcessingService.queueProcessingJob(document.id, 'TEXT_EXTRACTION', req.prisma);

          results.push({
            id: document.id,
            originalName: document.originalName,
            title: document.title,
            documentType: document.documentType,
            size: document.fileSize,
            uploadStatus: document.uploadStatus,
            processingStatus: document.processingStatus
          });

        } else {
          // Large file - initialize chunked upload
          const uploadSession = await documentProcessingService.initializeChunkedUpload(
            contractId,
            {
              originalName: file.originalname,
              fileSize: file.size,
              fileType: file.mimetype,
              documentType: metadata.documentType || 'PRIMARY',
              title: metadata.title || file.originalname,
              sequenceOrder: metadata.sequenceOrder || i,
              parentDocumentId: metadata.parentDocumentId,
              uploadedBy: req.user?.id
            },
            req.prisma
          );

          // Process as single chunk since we have the complete file
          await documentProcessingService.processChunk(
            uploadSession.documentId,
            0,
            file.buffer,
            req.prisma
          );

          results.push({
            id: uploadSession.documentId,
            originalName: file.originalname,
            title: metadata.title || file.originalname,
            documentType: metadata.documentType || 'PRIMARY',
            size: file.size,
            uploadStatus: 'PROCESSING',
            processingStatus: 'PENDING',
            requiresChunking: true
          });
        }

      } catch (fileError) {
        errors.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    res.status(results.length > 0 ? 201 : 400).json({
      message: `Processed ${results.length} of ${req.files.length} files successfully`,
      documents: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Multiple document upload error:', error);
    res.status(500).json({ error: 'Document upload failed' });
  }
});

// Get upload status for a document
router.get('/upload/:documentId/status', optionalAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const status = await documentProcessingService.getDocumentStatus(documentId, req.prisma);
    res.json(status);

  } catch (error) {
    console.error('Get upload status error:', error);
    res.status(500).json({ error: 'Failed to get upload status' });
  }
});

// Get all documents for a contract
router.get('/contracts/:contractId/documents', optionalAuth, async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const documents = await documentProcessingService.getContractDocuments(contractId, req.prisma);
    
    res.json({
      contractId,
      documents,
      total: documents.length
    });

  } catch (error) {
    console.error('Get contract documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Get document details with pages
router.get('/documents/:documentId', optionalAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await req.prisma.contractDocument.findUnique({
      where: { id: documentId },
      include: {
        contract: {
          select: { id: true, name: true, client: true }
        },
        parentDocument: {
          select: { id: true, title: true, documentType: true }
        },
        childDocuments: {
          select: { id: true, title: true, documentType: true }
        },
        pages: {
          orderBy: { pageNumber: 'asc' },
          select: {
            id: true,
            pageNumber: true,
            wordCount: true,
            characterCount: true,
            confidenceScore: true,
            processingStatus: true,
            hasTable: true,
            hasImage: true,
            language: true,
            processedAt: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);

  } catch (error) {
    console.error('Get document details error:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

// Get extracted text content for a page
router.get('/documents/:documentId/pages/:pageNumber/content', optionalAuth, async (req, res) => {
  try {
    const { documentId, pageNumber } = req.params;
    
    const page = await req.prisma.documentPage.findUnique({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber: parseInt(pageNumber)
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({
      pageNumber: page.pageNumber,
      extractedText: page.extractedText,
      wordCount: page.wordCount,
      confidenceScore: page.confidenceScore,
      processingStatus: page.processingStatus,
      metadata: {
        extractionMethod: page.extractionMethod,
        ocrProvider: page.ocrProvider,
        processingTime: page.processingTime,
        hasTable: page.hasTable,
        hasImage: page.hasImage,
        language: page.language
      }
    });

  } catch (error) {
    console.error('Get page content error:', error);
    res.status(500).json({ error: 'Failed to retrieve page content' });
  }
});

// Get consolidated document text (all pages combined)
router.get('/documents/:documentId/content', optionalAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await req.prisma.contractDocument.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
          select: {
            pageNumber: true,
            extractedText: true,
            processingStatus: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const completedPages = document.pages.filter(p => p.processingStatus === 'COMPLETED');
    const consolidatedText = completedPages
      .map(page => `--- Page ${page.pageNumber} ---\n${page.extractedText}`)
      .join('\n\n');

    res.json({
      documentId: document.id,
      title: document.title,
      consolidatedText,
      pagesIncluded: completedPages.length,
      totalPages: document.pages.length,
      isComplete: completedPages.length === document.pages.length
    });

  } catch (error) {
    console.error('Get document content error:', error);
    res.status(500).json({ error: 'Failed to retrieve document content' });
  }
});

// Update document metadata
router.put('/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, documentType, sequenceOrder, parentDocumentId } = req.body;
    
    const document = await req.prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        title,
        documentType,
        sequenceOrder: sequenceOrder ? parseInt(sequenceOrder) : undefined,
        parentDocumentId
      }
    });

    res.json({
      message: 'Document updated successfully',
      document: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        sequenceOrder: document.sequenceOrder
      }
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document and all associated data
router.delete('/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await req.prisma.contractDocument.findUnique({
      where: { id: documentId },
      include: {
        chunks: true,
        childDocuments: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document has child documents
    if (document.childDocuments.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete document with child documents',
        childCount: document.childDocuments.length 
      });
    }

    // Delete file from filesystem
    if (document.filePath) {
      try {
        await documentProcessingService.deleteFile(document.filePath);
      } catch (fileError) {
        console.warn(`Failed to delete file ${document.filePath}:`, fileError);
      }
    }

    // Clean up chunk files
    if (document.chunks.length > 0) {
      await documentProcessingService.cleanupChunks(document.chunks);
    }

    // Delete database records (cascading deletes will handle pages and chunks)
    await req.prisma.contractDocument.delete({
      where: { id: documentId }
    });

    res.status(204).send();

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Retry failed processing
router.post('/documents/:documentId/retry', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await req.prisma.contractDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.processingStatus !== 'FAILED') {
      return res.status(400).json({ error: 'Document is not in failed state' });
    }

    // Reset document status
    await req.prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: 'PENDING',
        errorMessage: null,
        processingProgress: 0
      }
    });

    // Queue processing job
    await documentProcessingService.queueProcessingJob(documentId, 'TEXT_EXTRACTION', req.prisma);

    res.json({
      message: 'Document processing retry initiated',
      documentId
    });

  } catch (error) {
    console.error('Retry processing error:', error);
    res.status(500).json({ error: 'Failed to retry processing' });
  }
});

// Get processing jobs status
router.get('/jobs/:entityId', optionalAuth, async (req, res) => {
  try {
    const { entityId } = req.params;
    
    const jobs = await req.prisma.processingJob.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobType: true,
        status: true,
        progress: true,
        currentStep: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        estimatedDuration: true,
        errorMessage: true
      }
    });

    res.json({
      entityId,
      jobs
    });

  } catch (error) {
    console.error('Get processing jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve processing jobs' });
  }
});

export default router;