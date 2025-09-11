import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import localTextractService from '../services/localTextractService.js';
import fileService from '../services/fileService.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported for OCR`), false);
    }
  }
});

/**
 * POST /api/textract/analyze-document
 * Analyze single document with OCR (AWS Textract compatible)
 */
router.post('/analyze-document', optionalAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No document provided',
        message: 'Please provide a document file for analysis'
      });
    }

    const { features = ['TEXT'], humanLoopConfig } = req.body;
    
    console.log(`📄 Analyzing document: ${req.file.originalname} (${req.file.mimetype})`);

    // Process document through LocalTextractService
    const result = await localTextractService.analyzeDocument(req.file.buffer, {
      documentType: req.file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      features: Array.isArray(features) ? features : [features],
      blocks: true
    });

    // Log processing results
    if (result.JobStatus === 'SUCCEEDED') {
      const textLength = localTextractService.extractTextFromBlocks(result.Blocks).length;
      console.log(`✅ OCR completed: ${result.Blocks?.length || 0} blocks, ${textLength} characters`);
    } else {
      console.log(`❌ OCR failed: ${result.StatusMessage}`);
    }

    // Return AWS Textract compatible response
    res.json({
      JobStatus: result.JobStatus,
      StatusMessage: result.StatusMessage,
      DocumentMetadata: result.DocumentMetadata,
      Blocks: result.Blocks,
      DetectDocumentTextModelVersion: result.DetectDocumentTextModelVersion,
      AnalyzeDocumentModelVersion: result.AnalyzeDocumentModelVersion,
      ProcessingTime: result.ProcessingTime,
      // Additional metadata for debugging
      RequestMetadata: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        features: features,
        processingMethod: 'local'
      }
    });

  } catch (error) {
    console.error('Textract analyze-document error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large for OCR processing' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field' });
      }
    }
    
    res.status(500).json({ 
      error: 'Document analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/textract/start-document-analysis
 * Start async document analysis job
 */
router.post('/start-document-analysis', optionalAuth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No document provided',
        message: 'Please provide a document file for analysis'
      });
    }

    const { features = ['TEXT'], clientRequestToken } = req.body;
    
    console.log(`🚀 Starting async analysis: ${req.file.originalname}`);

    // Start async processing
    const result = await localTextractService.startDocumentAnalysis(req.file.buffer, {
      documentType: req.file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      features: Array.isArray(features) ? features : [features],
      clientRequestToken
    });

    res.json({
      JobId: result.JobId,
      JobStatus: result.JobStatus
    });

  } catch (error) {
    console.error('Textract start-document-analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to start document analysis',
      message: error.message
    });
  }
});

/**
 * GET /api/textract/get-document-analysis/:jobId
 * Get status and results of async document analysis job
 */
router.get('/get-document-analysis/:jobId', optionalAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = localTextractService.getDocumentAnalysis(jobId);
    
    res.json(result);

  } catch (error) {
    console.error('Textract get-document-analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to get document analysis',
      message: error.message
    });
  }
});

/**
 * POST /api/textract/batch-analyze
 * Process multiple documents in batch
 */
router.post('/batch-analyze', optionalAuth, upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No documents provided',
        message: 'Please provide document files for batch analysis'
      });
    }

    const { features = ['TEXT'] } = req.body;
    const results = [];
    const errors = [];

    console.log(`📋 Starting batch analysis of ${req.files.length} documents`);

    // Process each file
    for (const [index, file] of req.files.entries()) {
      try {
        console.log(`   Processing ${index + 1}/${req.files.length}: ${file.originalname}`);
        
        const result = await localTextractService.analyzeDocument(file.buffer, {
          documentType: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
          features: Array.isArray(features) ? features : [features],
          blocks: true
        });

        results.push({
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          jobStatus: result.JobStatus,
          statusMessage: result.StatusMessage,
          documentMetadata: result.DocumentMetadata,
          blocks: result.Blocks,
          textExtracted: result.JobStatus === 'SUCCEEDED' 
            ? localTextractService.extractTextFromBlocks(result.Blocks)
            : '',
          processingTime: result.ProcessingTime
        });

      } catch (fileError) {
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    console.log(`✅ Batch analysis completed: ${results.length} successful, ${errors.length} failed`);

    res.json({
      message: `Processed ${results.length} of ${req.files.length} documents successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalFiles: req.files.length,
        successful: results.length,
        failed: errors.length,
        totalTextCharacters: results.reduce((sum, r) => sum + (r.textExtracted?.length || 0), 0)
      }
    });

  } catch (error) {
    console.error('Textract batch-analyze error:', error);
    res.status(500).json({ 
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/textract/service-status
 * Get LocalTextractService status and configuration
 */
router.get('/service-status', optionalAuth, async (req, res) => {
  try {
    const status = localTextractService.getStatus();
    
    res.json({
      ...status,
      timestamp: new Date().toISOString(),
      environment: {
        useNativeTesseract: process.env.USE_NATIVE_TESSERACT === 'true',
        useLocalTextract: process.env.USE_LOCAL_TEXTRACT !== 'false'
      }
    });

  } catch (error) {
    console.error('Textract service-status error:', error);
    res.status(500).json({ 
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

/**
 * POST /api/textract/cleanup-jobs
 * Clean up completed async jobs (admin only)
 */
router.post('/cleanup-jobs', authenticate, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { maxAgeHours = 24 } = req.body;
    const remainingJobs = localTextractService.cleanupCompletedJobs(maxAgeHours * 60 * 60 * 1000);
    
    res.json({
      message: 'Job cleanup completed',
      remainingActiveJobs: remainingJobs,
      maxAgeHours
    });

  } catch (error) {
    console.error('Textract cleanup-jobs error:', error);
    res.status(500).json({ 
      error: 'Job cleanup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/textract/extract-forms
 * Extract form key-value pairs (future enhancement placeholder)
 */
router.post('/extract-forms', optionalAuth, upload.single('document'), async (req, res) => {
  try {
    // This is a placeholder for future form extraction capability
    res.json({
      message: 'Form extraction not yet implemented',
      suggestion: 'Use analyze-document endpoint for text extraction',
      plannedFeatures: [
        'Key-value pair detection',
        'Checkbox detection',
        'Table extraction',
        'Signature detection'
      ]
    });

  } catch (error) {
    console.error('Textract extract-forms error:', error);
    res.status(500).json({ 
      error: 'Form extraction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/textract/extract-tables
 * Extract table data (future enhancement placeholder)
 */
router.post('/extract-tables', optionalAuth, upload.single('document'), async (req, res) => {
  try {
    // This is a placeholder for future table extraction capability
    res.json({
      message: 'Table extraction not yet implemented',
      suggestion: 'Use analyze-document endpoint for text extraction',
      plannedFeatures: [
        'Table structure detection',
        'Cell content extraction',
        'Header identification',
        'CSV/JSON export'
      ]
    });

  } catch (error) {
    console.error('Textract extract-tables error:', error);
    res.status(500).json({ 
      error: 'Table extraction failed',
      message: error.message
    });
  }
});

export default router;