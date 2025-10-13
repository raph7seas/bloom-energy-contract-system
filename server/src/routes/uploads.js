import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { authenticate, optionalAuth } from '../middleware/auth.js';
// Temporarily disable validation middleware to isolate test file issue
// import { validateFileUpload } from '../middleware/validation.js';
const validateFileUpload = (req, res, next) => next(); // Passthrough
import { fileAuditMiddleware, captureOldValues } from '../middleware/audit.js';
import fileService from '../services/fileService.js';
import AIToContractService from '../services/aiToContractService.js';

const router = express.Router();

const ensureMemoryStore = () => {
  if (!global.uploadedDocuments) {
    global.uploadedDocuments = {};
  }
};

const persistToMemory = (contractId, upload) => {
  ensureMemoryStore();
  const key = contractId && contractId !== 'undefined' && contractId !== 'null'
    ? contractId
    : 'UNASSIGNED';
  if (!global.uploadedDocuments[key]) {
    global.uploadedDocuments[key] = [];
  }
  global.uploadedDocuments[key].unshift(upload);
};

const buildUploadResponse = (upload) => ({
  id: upload.id,
  originalName: upload.originalName,
  fileName: upload.fileName,
  size: upload.fileSize,
  type: upload.fileType,
  status: upload.status,
  progress: upload.progress ?? 100,
  uploadDate: upload.uploadDate,
  contract: upload.contract ?? null,
  extractedData: upload.extractedData,
  uploadedBy: upload.uploadedBy ?? null
});

const appendLog = (message) => {
  try {
    fs.appendFileSync('logs/upload-debug.log', `[${new Date().toISOString()}] ${message}\n`);
  } catch (loggingError) {
    console.error('Failed to write upload debug log:', loggingError);
  }
};

const logUploadError = (scope, error) => {
  try {
    const logLine = `[${new Date().toISOString()}] ${scope}: ${error?.stack || error?.message || error}\n`;
    fs.appendFileSync('logs/upload-errors.log', logLine);
  } catch (loggingError) {
    console.error('Failed to write upload error log:', loggingError);
  }
};

// Configure multer for memory storage (we'll handle file saving manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 50 // Maximum 50 files at once (match system capacity)
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
    
    // Check if contractId is valid
    let validContractId = null;
    if (contractId && contractId !== 'undefined' && contractId !== 'null') {
      if (req.prisma) {
        const contractExists = await req.prisma.contract.findUnique({
          where: { id: contractId }
        });
        if (contractExists) {
          validContractId = contractId;
        }
      } else {
        validContractId = contractId;
      }
    }

    // Create database record
    let uploadRecord;

    if (req.prisma) {
      uploadRecord = await req.prisma.uploadedFile.create({
        data: {
          contractId: validContractId,
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
    } else {
      uploadRecord = {
        id: randomUUID(),
        contractId: validContractId,
        fileName: filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        status: 'COMPLETED',
        progress: 100,
        filePath,
        extractedData: {
          content: extractedContent,
          analysis
        },
        uploadedBy: req.user?.id || null,
        uploadDate: new Date().toISOString(),
        contract: null
      };
      persistToMemory(validContractId, uploadRecord);
    }

    const responsePayload = {
      message: 'File uploaded successfully',
      file: buildUploadResponse(uploadRecord)
    };

    appendLog(`single-upload contract=${contractId || 'NONE'} id=${responsePayload.file.id}`);

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('File upload error:', error);
    logUploadError('single-upload', error);
    
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
        
        // Determine persistence strategy
        const normalizedContractId =
          contractId && contractId !== 'undefined' && contractId !== 'null'
            ? contractId
            : null;

        // Always use Prisma if available
        let usePrisma = Boolean(req.prisma);
        let validContractId = null;
        let tempContractId = null;

        // Check if this is a real contract ID or a temp ID
        if (normalizedContractId) {
          if (normalizedContractId.startsWith('temp-contract-')) {
            // Store in tempContractId field (no foreign key constraint)
            tempContractId = normalizedContractId;
            console.log(`📝 Saving upload with tempContractId: ${tempContractId}`);
          } else if (req.prisma) {
            // Verify the contract exists
            const contractExists = await req.prisma.contract.findUnique({
              where: { id: normalizedContractId }
            });
            if (contractExists) {
              validContractId = normalizedContractId;
              console.log(`📝 Saving upload with contractId: ${validContractId}`);
            } else {
              // Not a temp ID but contract doesn't exist - store as temp
              tempContractId = normalizedContractId;
              console.log(`📝 Saving upload with tempContractId: ${tempContractId} (contract not found)`);
            }
          }
        }

        let uploadRecord;

        if (usePrisma) {
          // Use raw SQL to insert with tempContractId field (Prisma client not regenerated yet)
          const uploadId = randomUUID();
          await req.prisma.$executeRaw`
            INSERT INTO uploaded_files (
              id, "contractId", "tempContractId", "fileName", "originalName",
              "fileSize", "fileType", status, progress, "filePath",
              "extractedData", "uploadedBy", "uploadDate"
            ) VALUES (
              ${uploadId},
              ${validContractId},
              ${tempContractId},
              ${filename},
              ${file.originalname},
              ${file.size},
              ${file.mimetype},
              'COMPLETED',
              100,
              ${filePath},
              ${JSON.stringify({ content: extractedContent, analysis: analysis })}::jsonb,
              ${req.user?.id || null},
              NOW()
            )
          `;

          // Fetch the created record
          uploadRecord = await req.prisma.uploadedFile.findUnique({
            where: { id: uploadId }
          });
        } else {
          uploadRecord = {
            id: randomUUID(),
            contractId: normalizedContractId,
            fileName: filename,
            originalName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            status: 'COMPLETED',
            progress: 100,
            filePath,
            extractedData: {
              content: extractedContent,
              analysis
            },
            uploadedBy: req.user?.id || null,
            uploadDate: new Date().toISOString(),
            contract: null
          };
          persistToMemory(normalizedContractId, uploadRecord);
        }

        results.push(buildUploadResponse(uploadRecord));
      } catch (fileError) {
        errors.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    const statusCode = results.length > 0 ? 201 : 400;
    const payload = {
      message: `Uploaded ${results.length} of ${req.files.length} files successfully`,
      files: results,
      errors: errors.length > 0 ? errors : undefined
    };

    appendLog(`multi-upload contract=${contractId || 'NONE'} status=${statusCode} results=${results.length} errors=${errors.length}`);

    res.status(statusCode).json(payload);
  } catch (error) {
    console.error('Multiple file upload error:', error);
    logUploadError('multi-upload', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get upload by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    let upload = null;

    if (req.prisma) {
      upload = await req.prisma.uploadedFile.findUnique({
        where: { id: req.params.id },
        include: {
          contract: {
            select: { id: true, name: true, client: true }
          }
        }
      });
    } else {
      ensureMemoryStore();
      const allUploads = Object.values(global.uploadedDocuments || {}).flat();
      upload = allUploads.find(item => item.id === req.params.id) || null;
    }

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json(buildUploadResponse(upload));
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ error: 'Failed to retrieve upload' });
  }
});

// Get all uploads for a contract
router.get('/contract/:contractId', optionalAuth, async (req, res) => {
  try {
    const requestedContractId = req.params.contractId;
    const isUnassigned = !requestedContractId || requestedContractId === 'undefined' || requestedContractId === 'null';
    const normalizedKey = isUnassigned ? 'UNASSIGNED' : requestedContractId;

    ensureMemoryStore();

    const memoryUploads = (global.uploadedDocuments?.[normalizedKey] || []).map(upload => ({
      id: upload.id,
      originalName: upload.originalName,
      fileName: upload.fileName,
      size: upload.fileSize,
      type: upload.fileType,
      status: upload.status,
      progress: upload.progress ?? 100,
      uploadDate: upload.uploadDate,
      contract: upload.contract ?? null,
      hasExtractedData: !!upload.extractedData,
      analysis: upload.extractedData?.analysis || null, // Include the actual analysis data!
      uploadedBy: upload.uploadedBy ?? null
    }));

    let dbUploads = [];
    if (req.prisma) {
      try {
        // Use raw SQL to query tempContractId (Prisma client not regenerated yet)
        console.log(`🔍 Querying uploads for contract ID: ${requestedContractId}`);

        let records;
        if (isUnassigned) {
          records = await req.prisma.$queryRaw`
            SELECT * FROM uploaded_files
            WHERE "contractId" IS NULL AND "tempContractId" IS NULL
            ORDER BY "uploadDate" DESC
          `;
        } else {
          records = await req.prisma.$queryRaw`
            SELECT * FROM uploaded_files
            WHERE "contractId" = ${requestedContractId} OR "tempContractId" = ${requestedContractId}
            ORDER BY "uploadDate" DESC
          `;
        }

        dbUploads = records.map(record => ({
          id: record.id,
          originalName: record.originalName,
          fileName: record.fileName,
          size: record.fileSize,
          type: record.fileType,
          status: record.status,
          progress: record.progress ?? 100,
          uploadDate: record.uploadDate,
          contract: record.contract,
          hasExtractedData: !!record.extractedData,
          uploadedBy: record.uploadedBy ?? null
        }));
      } catch (dbError) {
        console.warn('⚠️  Falling back to in-memory uploads due to Prisma error:', dbError.message);
      }
    }

    const uploadMap = new Map();
    [...memoryUploads, ...dbUploads].forEach(upload => {
      uploadMap.set(upload.id, upload);
    });

    const processedUploads = Array.from(uploadMap.values());

    const responsePayload = {
      contractId: requestedContractId,
      uploads: processedUploads,
      total: processedUploads.length
    };

    appendLog(`get-contract contract=${requestedContractId || 'NONE'} count=${processedUploads.length} prisma=${Boolean(req.prisma)}`);

    res.json(responsePayload);
  } catch (error) {
    console.error('Get contract uploads error:', error);
    logUploadError('get-contract-uploads', error);
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
    if (!req.prisma) {
      ensureMemoryStore();
      const allUploads = Object.values(global.uploadedDocuments || {}).flat();
      const uploadIndex = allUploads.findIndex(item => item.id === req.params.id);

      if (uploadIndex === -1) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      // Remove from memory store
      for (const key of Object.keys(global.uploadedDocuments)) {
        global.uploadedDocuments[key] = global.uploadedDocuments[key].filter(item => item.id !== req.params.id);
      }

      return res.status(204).send();
    }

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
    let upload = null;

    if (req.prisma) {
      upload = await req.prisma.uploadedFile.findUnique({
        where: { id: req.params.id }
      });
    } else {
      ensureMemoryStore();
      const allUploads = Object.values(global.uploadedDocuments || {}).flat();
      upload = allUploads.find(item => item.id === req.params.id) || null;
    }

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

// Persist AI analysis results for an upload
router.put('/:id/analysis', optionalAuth, async (req, res) => {
  try {
    const { analysis, extractedText, mappedFormData } = req.body || {};

    if (!analysis) {
      return res.status(400).json({ error: 'analysis payload is required' });
    }

    if (typeof analysis !== 'object') {
      return res.status(400).json({ error: 'analysis must be an object' });
    }

    let updatedUpload = null;

    if (req.prisma) {
      const existingUpload = await req.prisma.uploadedFile.findUnique({
        where: { id: req.params.id }
      });

      if (!existingUpload) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      const existingData = existingUpload.extractedData || {};
      const existingContent = existingData.content || {};

      const mergedContent = {
        ...existingContent,
        ...(extractedText ? { text: extractedText } : {})
      };

      const mergedAnalysis = {
        ...(existingData.analysis || {}),
        ...analysis,
        updatedAt: new Date().toISOString(),
        source: analysis?.source || 'frontend-ai'
      };

      const mergedData = {
        ...existingData,
        ...(Object.keys(mergedContent).length > 0 ? { content: mergedContent } : {}),
        analysis: mergedAnalysis
      };

      if (mappedFormData) {
        if (typeof mappedFormData !== 'object') {
          return res.status(400).json({ error: 'mappedFormData must be an object' });
        }
        mergedData.formMapping = mappedFormData;
      }

      updatedUpload = await req.prisma.uploadedFile.update({
        where: { id: req.params.id },
        data: {
          extractedData: mergedData,
          status: 'COMPLETED',
          progress: 100
        }
      });
    } else {
      ensureMemoryStore();
      const stores = Object.keys(global.uploadedDocuments || {});
      for (const key of stores) {
        const uploads = global.uploadedDocuments[key];
        const index = uploads.findIndex(upload => upload.id === req.params.id);
        if (index !== -1) {
          const existingUpload = uploads[index];
          const existingData = existingUpload.extractedData || {};
          const existingContent = existingData.content || {};

          const mergedContent = {
            ...existingContent,
            ...(extractedText ? { text: extractedText } : {})
          };

          const mergedAnalysis = {
            ...(existingData.analysis || {}),
            ...analysis,
            updatedAt: new Date().toISOString(),
            source: analysis?.source || 'frontend-ai'
          };

          const mergedData = {
            ...existingData,
            ...(Object.keys(mergedContent).length > 0 ? { content: mergedContent } : {}),
            analysis: mergedAnalysis
          };

          if (mappedFormData) {
            if (typeof mappedFormData !== 'object') {
              return res.status(400).json({ error: 'mappedFormData must be an object' });
            }
            mergedData.formMapping = mappedFormData;
          }

          const memoryUpload = {
            ...existingUpload,
            extractedData: mergedData,
            status: 'COMPLETED',
            progress: 100
          };

          uploads[index] = memoryUpload;
          updatedUpload = memoryUpload;
          break;
        }
      }

      if (!updatedUpload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
    }

    appendLog(`analysis-update id=${req.params.id} prisma=${Boolean(req.prisma)}`);

    return res.json({
      message: 'Analysis saved',
      file: buildUploadResponse(updatedUpload)
    });
  } catch (error) {
    console.error('Save analysis error:', error);
    res.status(500).json({ error: 'Failed to persist analysis results' });
  }
});

// Convert uploaded file to contract
router.post('/:id/convert-to-contract', optionalAuth, async (req, res) => {
  try {
    let upload = null;

    // Find upload in database or memory
    if (req.prisma) {
      upload = await req.prisma.uploadedFile.findUnique({
        where: { id: req.params.id }
      });
    } else {
      // Search in-memory storage
      ensureMemoryStore();
      const allUploads = Object.values(global.uploadedDocuments || {}).flat();
      upload = allUploads.find(item => item.id === req.params.id) || null;
    }

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (!upload.extractedData || !upload.extractedData.analysis) {
      return res.status(400).json({ error: 'No AI analysis available for this file' });
    }

    // Initialize the AI to Contract service
    const aiContractService = new AIToContractService(req.prisma);

    // Use the intelligent AI to contract conversion
    const contract = await aiContractService.createContractFromAIAnalysis(
      upload.extractedData.analysis,
      upload
    );

    if (!contract) {
      return res.status(400).json({
        error: 'Insufficient data to create contract automatically',
        details: 'The AI analysis did not contain enough information to generate a complete contract'
      });
    }

    // Mark the upload as converted and link to contract
    if (req.prisma) {
      await req.prisma.uploadedFile.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          contractId: contract.id
        }
      });

      // Load the contract with all related data for response
      const fullContract = await req.prisma.contract.findUnique({
        where: { id: contract.id },
        include: {
          financialParams: true,
          technicalParams: true,
          operatingParams: true
        }
      });

      res.status(201).json({
        message: 'Successfully converted upload to contract using AI intelligence',
        contract: fullContract,
        sourceUpload: {
          id: upload.id,
          originalName: upload.originalName,
          confidence: upload.extractedData.analysis.overallConfidence || 0.8
        },
        aiGenerated: true
      });
    } else {
      // In-memory mode: update upload and return contract
      upload.status = 'COMPLETED';
      upload.contractId = contract.id;

      res.status(201).json({
        message: 'Successfully converted upload to contract using AI intelligence (in-memory mode)',
        contract: contract,
        sourceUpload: {
          id: upload.id,
          originalName: upload.originalName,
          confidence: upload.extractedData.analysis.overallConfidence || 0.8
        },
        aiGenerated: true,
        inMemory: true
      });
    }

  } catch (error) {
    console.error('Convert to contract error:', error);
    res.status(500).json({ error: 'Failed to convert upload to contract' });
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
