import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateFileUpload } from '../middleware/validation.js';
import { fileAuditMiddleware, captureOldValues } from '../middleware/audit.js';
import fileService from '../services/fileService.js';

const router = express.Router();

// Configure multer for memory storage (we'll handle file saving manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files at once
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

// Upload single file
router.post('/single', optionalAuth, upload.single('file'), validateFileUpload, fileAuditMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { contractId, description } = req.body;
    
    // Validate file
    const validationErrors = fileService.validateFile(req.file, req.file.buffer);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'File validation failed', 
        details: validationErrors 
      });
    }

    // Generate unique filename
    const filename = fileService.generateUniqueFilename(req.file.originalname, contractId);
    
    // Save file
    const filePath = await fileService.saveFile(req.file.buffer, filename);
    
    // Extract content
    const extractedContent = await fileService.extractFileContent(
      req.file.buffer, 
      req.file.mimetype
    );
    
    // Analyze content
    const analysis = await fileService.analyzeFileContent(extractedContent, req.file.originalname);
    
    // Create database record
    const uploadRecord = await req.prisma.uploadedFile.create({
      data: {
        contractId: contractId || null,
        fileName: filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        status: 'COMPLETED',
        progress: 100,
        filePath: filePath,
        extractedData: {
          content: extractedContent,
          analysis: analysis
        },
        uploadedBy: req.user?.id || null
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: uploadRecord.id,
        originalName: uploadRecord.originalName,
        fileName: uploadRecord.fileName,
        size: uploadRecord.fileSize,
        type: uploadRecord.fileType,
        status: uploadRecord.status,
        extractedContent: extractedContent.text ? {
          hasText: analysis.hasText,
          textLength: analysis.textLength,
          wordCount: analysis.wordCount,
          containsContractTerms: analysis.containsContractTerms,
          confidenceScore: analysis.confidenceScore
        } : null,
        uploadDate: uploadRecord.uploadDate
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field' });
      }
    }
    
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Upload multiple files
router.post('/multiple', optionalAuth, upload.array('files', 5), validateFileUpload, fileAuditMiddleware, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { contractId, description } = req.body;
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Validate file
        const validationErrors = fileService.validateFile(file, file.buffer);
        if (validationErrors.length > 0) {
          errors.push({
            file: file.originalname,
            errors: validationErrors
          });
          continue;
        }

        // Generate unique filename
        const filename = fileService.generateUniqueFilename(file.originalname, contractId);
        
        // Save file
        const filePath = await fileService.saveFile(file.buffer, filename);
        
        // Extract content
        const extractedContent = await fileService.extractFileContent(
          file.buffer, 
          file.mimetype
        );
        
        // Analyze content
        const analysis = await fileService.analyzeFileContent(extractedContent, file.originalname);
        
        // Create database record
        const uploadRecord = await req.prisma.uploadedFile.create({
          data: {
            contractId: contractId || null,
            fileName: filename,
            originalName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            status: 'COMPLETED',
            progress: 100,
            filePath: filePath,
            extractedData: {
              content: extractedContent,
              analysis: analysis
            },
            uploadedBy: req.user?.id || null
          }
        });

        results.push({
          id: uploadRecord.id,
          originalName: uploadRecord.originalName,
          fileName: uploadRecord.fileName,
          size: uploadRecord.fileSize,
          type: uploadRecord.fileType,
          status: uploadRecord.status,
          extractedContent: extractedContent.text ? {
            hasText: analysis.hasText,
            textLength: analysis.textLength,
            wordCount: analysis.wordCount,
            containsContractTerms: analysis.containsContractTerms,
            confidenceScore: analysis.confidenceScore
          } : null,
          uploadDate: uploadRecord.uploadDate
        });
      } catch (fileError) {
        errors.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    res.status(results.length > 0 ? 201 : 400).json({
      message: `Uploaded ${results.length} of ${req.files.length} files successfully`,
      files: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get upload by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const upload = await req.prisma.uploadedFile.findUnique({
      where: { id: req.params.id },
      include: {
        contract: {
          select: { id: true, name: true, client: true }
        }
      }
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({
      id: upload.id,
      originalName: upload.originalName,
      fileName: upload.fileName,
      size: upload.fileSize,
      type: upload.fileType,
      status: upload.status,
      progress: upload.progress,
      uploadDate: upload.uploadDate,
      contract: upload.contract,
      extractedData: upload.extractedData,
      uploadedBy: upload.uploadedBy
    });
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ error: 'Failed to retrieve upload' });
  }
});

// Get all uploads for a contract
router.get('/contract/:contractId', optionalAuth, async (req, res) => {
  try {
    const uploads = await req.prisma.uploadedFile.findMany({
      where: { contractId: req.params.contractId },
      orderBy: { uploadDate: 'desc' },
      include: {
        contract: {
          select: { id: true, name: true, client: true }
        }
      }
    });

    const processedUploads = uploads.map(upload => ({
      id: upload.id,
      originalName: upload.originalName,
      fileName: upload.fileName,
      size: upload.fileSize,
      type: upload.fileType,
      status: upload.status,
      progress: upload.progress,
      uploadDate: upload.uploadDate,
      contract: upload.contract,
      hasExtractedData: !!upload.extractedData,
      uploadedBy: upload.uploadedBy
    }));

    res.json({
      contractId: req.params.contractId,
      uploads: processedUploads,
      total: uploads.length
    });
  } catch (error) {
    console.error('Get contract uploads error:', error);
    res.status(500).json({ error: 'Failed to retrieve uploads' });
  }
});

// Get all uploads (with pagination)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      contractId,
      search 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    if (type) where.fileType = { contains: type };
    if (status) where.status = status;
    if (contractId) where.contractId = contractId;
    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [uploads, total] = await Promise.all([
      req.prisma.uploadedFile.findMany({
        where,
        include: {
          contract: {
            select: { id: true, name: true, client: true }
          }
        },
        orderBy: { uploadDate: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      req.prisma.uploadedFile.count({ where })
    ]);

    const processedUploads = uploads.map(upload => ({
      id: upload.id,
      originalName: upload.originalName,
      fileName: upload.fileName,
      size: upload.fileSize,
      type: upload.fileType,
      status: upload.status,
      progress: upload.progress,
      uploadDate: upload.uploadDate,
      contract: upload.contract,
      hasExtractedData: !!upload.extractedData,
      uploadedBy: upload.uploadedBy
    }));

    res.json({
      uploads: processedUploads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ error: 'Failed to retrieve uploads' });
  }
});

// Delete upload
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const upload = await req.prisma.uploadedFile.findUnique({
      where: { id: req.params.id }
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete file from filesystem
    if (upload.filePath) {
      await fileService.deleteFile(upload.filePath);
    }

    // Delete database record
    await req.prisma.uploadedFile.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

// Get extracted text content
router.get('/:id/content', optionalAuth, async (req, res) => {
  try {
    const upload = await req.prisma.uploadedFile.findUnique({
      where: { id: req.params.id }
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (!upload.extractedData) {
      return res.status(404).json({ error: 'No extracted content available' });
    }

    res.json({
      id: upload.id,
      originalName: upload.originalName,
      extractedContent: upload.extractedData.content || {},
      analysis: upload.extractedData.analysis || {},
      extractedAt: upload.uploadDate
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// Cleanup old files (admin only)
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { maxAgeHours = 24 } = req.body;
    const deletedCount = await fileService.cleanupOldFiles(maxAgeHours);
    
    res.json({
      message: 'Cleanup completed',
      deletedFiles: deletedCount,
      maxAgeHours
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;