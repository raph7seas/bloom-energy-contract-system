import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import sharp from 'sharp';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import pdf2pic from 'pdf2pic';
import { exec } from 'child_process';
import { promisify } from 'util';
// Import services with error handling
let textractManager = null;
let notificationService = null;

try {
  const textractModule = await import('./textractManager.js');
  textractManager = textractModule.default;
} catch (error) {
  console.warn('⚠️ TextractManager not available:', error.message);
}

try {
  const notifModule = await import('./notificationService.js');
  notificationService = notifModule.default;
} catch (error) {
  console.warn('⚠️ NotificationService not available:', error.message);
}

const execAsync = promisify(exec);

class DocumentProcessingService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.chunksDir = path.join(this.uploadDir, 'chunks');
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.maxFileSize = 100 * 1024 * 1024; // 100MB per file
    this.maxFilesPerContract = 50;
    this.chunkSize = 5 * 1024 * 1024; // 5MB chunks
    this.allowedTypes = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'text/plain': '.txt',
      'application/json': '.json',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    this.initializeDirectories();
    this.processingJobs = new Map(); // In-memory job tracking
  }

  async initializeDirectories() {
    try {
      await Promise.all([
        this.createDirIfNotExists(this.uploadDir),
        this.createDirIfNotExists(this.chunksDir),
        this.createDirIfNotExists(this.tempDir)
      ]);
      console.log('📁 Document processing directories initialized');
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  async createDirIfNotExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  // Enhanced file validation for larger files
  validateFile(file, fileSize) {
    const errors = [];

    // Check file size (increased limit)
    if (fileSize > this.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!this.allowedTypes[file.mimetype || file.type]) {
      errors.push(`File type ${file.mimetype || file.type} is not supported`);
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid filename');
    }

    return errors;
  }

  // Generate unique filename with document metadata
  generateDocumentFilename(originalName, contractId, documentType = 'PRIMARY') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9\-_]/g, '');
    
    return `${contractId}-${documentType}-${timestamp}-${random}-${baseName}${ext}`;
  }

  // Calculate file hash for integrity verification
  calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // Initialize chunked upload for large files
  async initializeChunkedUpload(contractId, fileInfo, prisma) {
    const { originalName, fileSize, fileType } = fileInfo;
    const totalChunks = Math.ceil(fileSize / this.chunkSize);
    
    // Generate unique document ID
    const documentId = crypto.randomUUID();
    const fileName = this.generateDocumentFilename(originalName, contractId, fileInfo.documentType || 'PRIMARY');
    
    // Create document record
    const document = await prisma.contractDocument.create({
      data: {
        id: documentId,
        contractId,
        documentType: fileInfo.documentType || 'PRIMARY',
        sequenceOrder: fileInfo.sequenceOrder || 0,
        parentDocumentId: fileInfo.parentDocumentId || null,
        title: fileInfo.title || originalName,
        fileName,
        originalName,
        fileSize,
        fileType,
        uploadStatus: 'UPLOADING',
        processingStatus: 'PENDING',
        totalChunks,
        chunksUploaded: 0,
        uploadedBy: fileInfo.uploadedBy
      }
    });

    // Create chunk records
    const chunkPromises = [];
    for (let i = 0; i < totalChunks; i++) {
      chunkPromises.push(
        prisma.documentChunk.create({
          data: {
            documentId,
            chunkNumber: i,
            chunkSize: Math.min(this.chunkSize, fileSize - (i * this.chunkSize)),
            chunkHash: '', // Will be set when chunk is uploaded
            uploadStatus: 'PENDING'
          }
        })
      );
    }
    
    await Promise.all(chunkPromises);

    // Emit notification for upload started (if service available)
    if (notificationService) {
      notificationService.emit('document:upload:started', {
        documentId,
        documentTitle: fileInfo.title || originalName,
        contractId,
        fileSize,
        totalChunks,
        userId: fileInfo.uploadedBy
      });
    }
    
    return {
      documentId,
      totalChunks,
      chunkSize: this.chunkSize
    };
  }

  // Process uploaded chunk
  async processChunk(documentId, chunkNumber, chunkBuffer, prisma) {
    const chunkHash = this.calculateFileHash(chunkBuffer);
    const tempChunkPath = path.join(this.chunksDir, `${documentId}-chunk-${chunkNumber}`);
    
    // Save chunk to temporary file
    await fs.writeFile(tempChunkPath, chunkBuffer);
    
    // Update chunk record
    await prisma.documentChunk.update({
      where: {
        documentId_chunkNumber: {
          documentId,
          chunkNumber: parseInt(chunkNumber)
        }
      },
      data: {
        chunkHash,
        uploadStatus: 'COMPLETED',
        uploadedAt: new Date(),
        tempFilePath: tempChunkPath
      }
    });

    // Update document upload progress
    const document = await prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        chunksUploaded: {
          increment: 1
        }
      },
      include: {
        chunks: {
          where: { uploadStatus: 'COMPLETED' }
        }
      }
    });

    // Emit chunk upload notification (if service available)
    if (notificationService) {
      notificationService.emit('document:chunk:uploaded', {
        documentId,
        chunkNumber: parseInt(chunkNumber),
        chunksUploaded: document.chunksUploaded,
        totalChunks: document.totalChunks,
        userId: document.uploadedBy
      });
    }

    // Check if all chunks are uploaded
    if (document.chunksUploaded >= document.totalChunks) {
      await this.consolidateDocument(documentId, prisma);
    }

    return {
      documentId,
      chunkNumber: parseInt(chunkNumber),
      chunksUploaded: document.chunksUploaded,
      totalChunks: document.totalChunks,
      isComplete: document.chunksUploaded >= document.totalChunks
    };
  }

  // Consolidate chunks into final document
  async consolidateDocument(documentId, prisma) {
    console.log(`🔄 Consolidating document chunks for ${documentId}`);
    
    const document = await prisma.contractDocument.findUnique({
      where: { id: documentId },
      include: {
        chunks: {
          orderBy: { chunkNumber: 'asc' }
        }
      }
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const finalFilePath = path.join(this.uploadDir, document.fileName);
    const writeStream = await fs.open(finalFilePath, 'w');

    try {
      // Concatenate chunks in order
      for (const chunk of document.chunks) {
        if (chunk.uploadStatus !== 'COMPLETED' || !chunk.tempFilePath) {
          throw new Error(`Chunk ${chunk.chunkNumber} not ready for consolidation`);
        }
        
        const chunkBuffer = await fs.readFile(chunk.tempFilePath);
        await writeStream.write(chunkBuffer);
      }
      
      await writeStream.close();

      // Update document status
      await prisma.contractDocument.update({
        where: { id: documentId },
        data: {
          uploadStatus: 'COMPLETED',
          processingStatus: 'PENDING',
          filePath: finalFilePath,
          uploadProgress: 100
        }
      });

      // Clean up chunk files
      await this.cleanupChunks(document.chunks);

      // Emit consolidation notification (if service available)
      if (notificationService) {
        notificationService.emit('document:consolidated', {
          documentId,
          documentTitle: document.title,
          filePath: finalFilePath,
          userId: document.uploadedBy
        });
      }

      // Queue text extraction job
      await this.queueProcessingJob(documentId, 'TEXT_EXTRACTION', prisma);

      console.log(`✅ Document ${documentId} consolidated successfully`);
      return { documentId, filePath: finalFilePath };

    } catch (error) {
      await writeStream.close();
      await this.markDocumentAsFailed(documentId, `Consolidation failed: ${error.message}`, prisma);
      throw error;
    }
  }

  // Clean up temporary chunk files
  async cleanupChunks(chunks) {
    const cleanupPromises = chunks.map(async (chunk) => {
      if (chunk.tempFilePath) {
        try {
          await fs.unlink(chunk.tempFilePath);
        } catch (error) {
          console.warn(`Failed to cleanup chunk file ${chunk.tempFilePath}:`, error);
        }
      }
    });
    
    await Promise.all(cleanupPromises);
  }

  // Queue processing job
  async queueProcessingJob(entityId, jobType, prisma, jobConfig = {}) {
    const job = await prisma.processingJob.create({
      data: {
        jobType,
        entityType: 'contract_document',
        entityId,
        jobConfig,
        priority: jobConfig.priority || 5
      }
    });

    // Start processing immediately for now (in production, use a proper queue)
    setImmediate(() => this.processJob(job.id, prisma));
    
    return job;
  }

  // Process queued job
  async processJob(jobId, prisma) {
    try {
      const job = await prisma.processingJob.findUnique({
        where: { id: jobId }
      });

      if (!job || job.status !== 'PENDING') {
        return;
      }

      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date()
        }
      });

      let result;
      switch (job.jobType) {
        case 'TEXT_EXTRACTION':
          result = await this.extractDocumentText(job.entityId, prisma);
          break;
        case 'PAGE_ANALYSIS':
          result = await this.analyzeDocumentPages(job.entityId, prisma);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result,
          progress: 100
        }
      });

    } catch (error) {
      console.error(`Processing job ${jobId} failed:`, error);
      
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
          errorDetails: { stack: error.stack }
        }
      });
    }
  }

  // Extract text from document with page-by-page processing
  async extractDocumentText(documentId, prisma) {
    console.log(`📄 Extracting text from document ${documentId}`);
    
    const document = await prisma.contractDocument.findUnique({
      where: { id: documentId }
    });

    if (!document || !document.filePath) {
      throw new Error(`Document ${documentId} not found or file path missing`);
    }

    await prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: 'PROCESSING',
        extractionStarted: new Date()
      }
    });

    // Emit processing started notification (if service available)
    if (notificationService) {
      notificationService.emit('document:processing:started', {
        documentId,
        documentTitle: document.title,
        processingType: 'text_extraction',
        userId: document.uploadedBy
      });
    }

    const buffer = await fs.readFile(document.filePath);
    let extractedContent;

    try {
      switch (document.fileType) {
        case 'application/pdf':
          extractedContent = await this.extractTextFromPDFWithPages(buffer, document, prisma);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          extractedContent = await this.extractTextFromDocx(buffer);
          await this.createSinglePageRecord(document.id, extractedContent, prisma);
          break;
        case 'text/plain':
          extractedContent = { text: buffer.toString('utf-8') };
          await this.createSinglePageRecord(document.id, extractedContent, prisma);
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
          extractedContent = await this.extractTextFromImage(buffer);
          await this.createSinglePageRecord(document.id, extractedContent, prisma);
          break;
        default:
          throw new Error(`Unsupported file type: ${document.fileType}`);
      }

      // Update document with completion status
      await prisma.contractDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: 'COMPLETED',
          extractionCompleted: new Date(),
          pageCount: extractedContent.pages || 1,
          wordCount: extractedContent.wordCount || this.countWords(extractedContent.text || '')
        }
      });

      // Emit text extraction completion notification (if service available)
      if (notificationService) {
        notificationService.emit('document:text:extracted', {
          documentId,
          documentTitle: document.title,
          pageCount: extractedContent.pages || 1,
          wordCount: extractedContent.wordCount || this.countWords(extractedContent.text || ''),
          extractionMethod: extractedContent.extractionMethod || 'unknown',
          userId: document.uploadedBy
        });
      }

      console.log(`✅ Text extraction completed for document ${documentId}`);
      return { success: true, pageCount: extractedContent.pages || 1 };

    } catch (error) {
      await this.markDocumentAsFailed(documentId, `Text extraction failed: ${error.message}`, prisma);
      throw error;
    }
  }

  // Extract text from PDF with page-by-page processing
  async extractTextFromPDFWithPages(buffer, document, prisma) {
    const tempDir = path.join(this.tempDir, `pdf-${document.id}`);
    await fs.mkdir(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `${document.id}.pdf`);
    await fs.writeFile(tempFilePath, buffer);

    try {
      // Try pdf-parse first (pure JavaScript, always available)
      try {
        console.log('📄 Using pdf-parse for text extraction...');
        const pdfData = await pdfParse(buffer);

        // Create a single page record with all text (pdf-parse doesn't separate pages easily)
        await this.createPageRecord(document.id, 1, {
          text: pdfData.text.trim(),
          extractionMethod: 'pdf-parse',
          wordCount: this.countWords(pdfData.text)
        }, prisma);

        await fs.rm(tempDir, { recursive: true }).catch(() => {});

        console.log(`✅ PDF text extracted successfully using pdf-parse (${pdfData.numpages} pages, ${this.countWords(pdfData.text)} words)`);

        return {
          text: pdfData.text.trim(),
          pages: pdfData.numpages,
          wordCount: this.countWords(pdfData.text),
          extractionMethod: 'pdf-parse'
        };
      } catch (pdfParseError) {
        console.warn('⚠️ pdf-parse failed, trying pdftotext command...', pdfParseError.message);

        // Try pdftotext command-line tool as fallback
        try {
          const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`);
          const pages = stdout.split('\f'); // Form feed character separates pages

          // Create page records
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].trim()) {
              await this.createPageRecord(document.id, i + 1, {
                text: pages[i].trim(),
                extractionMethod: 'pdftotext',
                wordCount: this.countWords(pages[i])
              }, prisma);
            }
          }

          await fs.rm(tempDir, { recursive: true });
          return {
            text: stdout.trim(),
            pages: pages.length,
            extractionMethod: 'pdftotext'
          };

      } catch (pdfToTextError) {
        console.warn('⚠️ pdftotext command failed, trying OCR fallback...', pdfToTextError.message);
        // Fallback to pdf2pic + OCR
        return await this.extractPDFWithOCR(tempFilePath, document, prisma);
      }
      }
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp directory: ${cleanupError.message}`);
      }
    }
  }

  // Extract PDF using OCR (fallback method)
  async extractPDFWithOCR(tempFilePath, document, prisma) {
    const tempDir = path.dirname(tempFilePath);
    
    const convert = pdf2pic.fromPath(tempFilePath, {
      density: 200,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2048,
      height: 2048
    });

    const results = await convert.bulk(-1);
    const extractedPages = [];
    
    for (let i = 0; i < results.length; i++) {
      const pageImagePath = results[i].path;
      
      try {
        const imageBuffer = await fs.readFile(pageImagePath);
        const ocrResult = await this.extractTextFromImage(imageBuffer);
        
        await this.createPageRecord(document.id, i + 1, {
          text: ocrResult.text || '',
          extractionMethod: 'ocr',
          confidenceScore: ocrResult.confidence || 0,
          wordCount: this.countWords(ocrResult.text || ''),
          ocrProvider: 'textract',
          processingTime: ocrResult.processingTime
        }, prisma);

        extractedPages.push(ocrResult.text || '');
        
        // Cleanup page image
        await fs.unlink(pageImagePath);
      } catch (pageError) {
        console.warn(`Failed to process page ${i + 1}:`, pageError);
        await this.createPageRecord(document.id, i + 1, {
          text: '',
          extractionMethod: 'ocr',
          confidenceScore: 0,
          errorMessage: pageError.message
        }, prisma);
      }
    }

    return {
      text: extractedPages.join('\n\n'),
      pages: results.length,
      extractionMethod: 'ocr'
    };
  }

  // Create page record in database
  async createPageRecord(documentId, pageNumber, pageData, prisma) {
    return await prisma.documentPage.create({
      data: {
        documentId,
        pageNumber,
        extractedText: pageData.text || '',
        confidenceScore: pageData.confidenceScore,
        wordCount: pageData.wordCount || this.countWords(pageData.text || ''),
        characterCount: (pageData.text || '').length,
        ocrProvider: pageData.ocrProvider,
        processingTime: pageData.processingTime,
        extractionMethod: pageData.extractionMethod,
        width: pageData.width,
        height: pageData.height,
        hasTable: this.detectTables(pageData.text || ''),
        hasImage: pageData.hasImage || false,
        language: pageData.language || 'en',
        metadata: pageData.metadata || {},
        processingStatus: pageData.errorMessage ? 'FAILED' : 'COMPLETED',
        errorMessage: pageData.errorMessage,
        processedAt: new Date()
      }
    });
  }

  // Create single page record for non-PDF documents
  async createSinglePageRecord(documentId, extractedContent, prisma) {
    return await this.createPageRecord(documentId, 1, {
      text: extractedContent.text || '',
      extractionMethod: 'direct',
      wordCount: this.countWords(extractedContent.text || '')
    }, prisma);
  }

  // Extract text from DOCX
  async extractTextFromDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      wordCount: this.countWords(result.value),
      messages: result.messages
    };
  }

  // Extract text from images using OCR
  async extractTextFromImage(buffer) {
    try {
      // Check if textractManager is available
      if (!textractManager) {
        console.warn('⚠️ TextractManager not available, returning placeholder text');
        return {
          text: '[OCR service not available - image content not extracted]',
          confidence: 0,
          processingTime: 0,
          wordCount: 0
        };
      }

      const textractResult = await textractManager.analyzeDocument(buffer, {
        documentType: 'image',
        features: ['TEXT', 'TABLES', 'FORMS'],
        blocks: true
      });

      if (textractResult.JobStatus === 'SUCCEEDED') {
        // Extract text using the standardized method
        const extractedText = textractResult.Text || 
          textractResult.Blocks?.filter(block => block.BlockType === 'LINE')
            .map(block => block.Text).join('\n') || '';
        
        const confidenceScores = textractResult.Blocks
          .filter(block => block.Confidence)
          .map(block => block.Confidence);
        const avgConfidence = confidenceScores.length > 0 
          ? confidenceScores.reduce((a, b) => a + b) / confidenceScores.length 
          : 0;

        return {
          text: extractedText,
          confidence: avgConfidence,
          processingTime: textractResult.ProcessingTime,
          wordCount: this.countWords(extractedText)
        };
      } else {
        return {
          text: '',
          confidence: 0,
          error: textractResult.StatusMessage || 'OCR processing failed'
        };
      }
    } catch (error) {
      return {
        text: '',
        confidence: 0,
        error: error.message
      };
    }
  }

  // Save file to filesystem
  async saveFile(buffer, filename) {
    const filePath = path.join(this.uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  // Delete file from filesystem
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  // Utility methods
  countWords(text) {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  detectTables(text) {
    // Simple table detection - look for common table patterns
    const tablePatterns = [/\t.*\t/, /\|.*\|/, /^\s*\d+\.\s+.*\s+\d+/m];
    return tablePatterns.some(pattern => pattern.test(text));
  }

  async markDocumentAsFailed(documentId, errorMessage, prisma) {
    await prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        processingStatus: 'FAILED',
        uploadStatus: 'FAILED',
        errorMessage,
        extractionCompleted: new Date()
      }
    });
  }

  // Get document processing status
  async getDocumentStatus(documentId, prisma) {
    const document = await prisma.contractDocument.findUnique({
      where: { id: documentId },
      include: {
        chunks: true,
        pages: {
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const completedChunks = document.chunks.filter(c => c.uploadStatus === 'COMPLETED').length;
    const completedPages = document.pages.filter(p => p.processingStatus === 'COMPLETED').length;

    return {
      documentId: document.id,
      title: document.title,
      uploadStatus: document.uploadStatus,
      processingStatus: document.processingStatus,
      uploadProgress: document.uploadProgress,
      processingProgress: document.processingProgress,
      chunksUploaded: completedChunks,
      totalChunks: document.totalChunks,
      pagesProcessed: completedPages,
      totalPages: document.pageCount,
      fileSize: document.fileSize,
      errorMessage: document.errorMessage
    };
  }

  // Get contract documents with hierarchy
  async getContractDocuments(contractId, prisma) {
    const documents = await prisma.contractDocument.findMany({
      where: { contractId },
      include: {
        pages: {
          select: {
            id: true,
            pageNumber: true,
            wordCount: true,
            processingStatus: true
          },
          orderBy: { pageNumber: 'asc' }
        },
        childDocuments: {
          include: {
            pages: {
              select: { id: true, pageNumber: true, wordCount: true }
            }
          }
        }
      },
      orderBy: [{ documentType: 'asc' }, { sequenceOrder: 'asc' }]
    });

    return documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      sequenceOrder: doc.sequenceOrder,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      uploadStatus: doc.uploadStatus,
      processingStatus: doc.processingStatus,
      pageCount: doc.pageCount,
      wordCount: doc.wordCount,
      uploadDate: doc.uploadDate,
      hasChildren: doc.childDocuments.length > 0,
      childCount: doc.childDocuments.length,
      pagesProcessed: doc.pages.filter(p => p.processingStatus === 'COMPLETED').length
    }));
  }
}

export default new DocumentProcessingService();