import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import bulkOperationsService from '../services/bulkOperationsService.js';

const router = express.Router();

// Configure multer for bulk file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
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
      cb(new Error(`File type ${file.mimetype} is not supported for bulk import`), false);
    }
  }
});

/**
 * POST /api/bulk/import-contracts
 * Bulk import contracts from uploaded files
 */
router.post('/import-contracts', authenticate, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided for import' });
    }

    const options = {
      defaultClient: req.body.defaultClient || 'Unknown',
      extractRules: req.body.extractRules === 'true',
      useAI: req.body.useAI === 'true',
      autoExtractDetails: req.body.autoExtractDetails === 'true'
    };

    console.log(`🚀 Starting bulk import: ${req.files.length} files`);

    // Listen for job events and send progress updates
    const jobResult = await bulkOperationsService.bulkImportContracts(
      req.files, 
      options, 
      req.prisma, 
      req.user.id
    );

    // Set up real-time progress updates
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      // Server-sent events for real-time progress
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const progressHandler = (data) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`);
      };

      const completedHandler = (data) => {
        res.write(`data: ${JSON.stringify({ type: 'completed', ...data })}\n\n`);
        res.end();
        cleanup();
      };

      const failedHandler = (data) => {
        res.write(`data: ${JSON.stringify({ type: 'failed', ...data })}\n\n`);
        res.end();
        cleanup();
      };

      const cleanup = () => {
        bulkOperationsService.off('job:progress', progressHandler);
        bulkOperationsService.off('job:completed', completedHandler);
        bulkOperationsService.off('job:failed', failedHandler);
      };

      bulkOperationsService.on('job:progress', progressHandler);
      bulkOperationsService.on('job:completed', completedHandler);
      bulkOperationsService.on('job:failed', failedHandler);

      // Send initial response
      res.write(`data: ${JSON.stringify({ type: 'started', ...jobResult })}\n\n`);

    } else {
      // Standard JSON response
      res.status(202).json({
        message: 'Bulk import started',
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalFiles: req.files.length,
        statusUrl: `/api/bulk/jobs/${jobResult.jobId}`
      });
    }

  } catch (error) {
    console.error('Bulk import error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'One or more files are too large' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files (maximum 50)' });
      }
    }
    
    res.status(500).json({ error: 'Bulk import failed', message: error.message });
  }
});

/**
 * POST /api/bulk/export-contracts
 * Bulk export contracts in various formats
 */
router.post('/export-contracts', authenticate, async (req, res) => {
  try {
    const { contractIds, format = 'json', options = {} } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    const validFormats = ['json', 'csv', 'pdf', 'zip'];
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid format', 
        validFormats 
      });
    }

    console.log(`📤 Starting bulk export: ${contractIds.length} contracts as ${format}`);

    const jobResult = await bulkOperationsService.bulkExportContracts(
      contractIds,
      format,
      options,
      req.prisma
    );

    res.status(202).json({
      message: 'Bulk export started',
      jobId: jobResult.jobId,
      status: jobResult.status,
      totalContracts: contractIds.length,
      format,
      statusUrl: `/api/bulk/jobs/${jobResult.jobId}`,
      downloadUrl: `/api/bulk/download/${jobResult.jobId}`
    });

  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: 'Bulk export failed', message: error.message });
  }
});

/**
 * POST /api/bulk/extract-rules
 * Bulk rule extraction from multiple contracts
 */
router.post('/extract-rules', authenticate, authorize(['ADMIN', 'ANALYST']), async (req, res) => {
  try {
    const { contractIds, options = {} } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    console.log(`🔍 Starting bulk rule extraction: ${contractIds.length} contracts`);

    const jobResult = await bulkOperationsService.bulkExtractRules(
      contractIds,
      options,
      req.prisma
    );

    res.status(202).json({
      message: 'Bulk rule extraction started',
      jobId: jobResult.jobId,
      status: jobResult.status,
      totalContracts: contractIds.length,
      statusUrl: `/api/bulk/jobs/${jobResult.jobId}`
    });

  } catch (error) {
    console.error('Bulk rule extraction error:', error);
    res.status(500).json({ error: 'Bulk rule extraction failed', message: error.message });
  }
});

/**
 * POST /api/bulk/validate-contracts
 * Bulk validation of contracts against rules
 */
router.post('/validate-contracts', authenticate, async (req, res) => {
  try {
    const { contractIds, ruleSetId, options = {} } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    console.log(`✅ Starting bulk validation: ${contractIds.length} contracts`);

    const jobResult = await bulkOperationsService.bulkValidateContracts(
      contractIds,
      ruleSetId,
      options,
      req.prisma
    );

    res.status(202).json({
      message: 'Bulk validation started',
      jobId: jobResult.jobId,
      status: jobResult.status,
      totalContracts: contractIds.length,
      statusUrl: `/api/bulk/jobs/${jobResult.jobId}`
    });

  } catch (error) {
    console.error('Bulk validation error:', error);
    res.status(500).json({ error: 'Bulk validation failed', message: error.message });
  }
});

/**
 * PATCH /api/bulk/update-status
 * Bulk update contract status
 */
router.patch('/update-status', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { contractIds, status, options = {} } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    console.log(`🔄 Starting bulk status update: ${contractIds.length} contracts to ${status}`);

    const jobResult = await bulkOperationsService.bulkUpdateStatus(
      contractIds,
      status,
      options,
      req.prisma,
      req.user.id
    );

    res.json({
      message: 'Bulk status update completed',
      jobId: jobResult.jobId,
      status: jobResult.status,
      updatedCount: jobResult.updatedCount,
      totalContracts: contractIds.length
    });

  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({ error: 'Bulk status update failed', message: error.message });
  }
});

/**
 * DELETE /api/bulk/delete-contracts
 * Bulk delete contracts with safety checks
 */
router.delete('/delete-contracts', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { contractIds, options = {} } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    // Additional safety check for delete operations
    if (contractIds.length > 100 && !options.confirmLargeBatch) {
      return res.status(400).json({ 
        error: 'Large batch deletion requires confirmation',
        contractCount: contractIds.length,
        requiresConfirmation: true
      });
    }

    console.log(`🗑️  Starting bulk deletion: ${contractIds.length} contracts`);

    const jobResult = await bulkOperationsService.bulkDeleteContracts(
      contractIds,
      options,
      req.prisma,
      req.user.id
    );

    res.status(202).json({
      message: 'Bulk deletion started',
      jobId: jobResult.jobId,
      status: jobResult.status,
      totalContracts: contractIds.length,
      statusUrl: `/api/bulk/jobs/${jobResult.jobId}`,
      warning: 'This operation cannot be undone'
    });

  } catch (error) {
    console.error('Bulk deletion error:', error);
    res.status(500).json({ error: 'Bulk deletion failed', message: error.message });
  }
});

/**
 * GET /api/bulk/jobs/:jobId
 * Get job status and progress
 */
router.get('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = bulkOperationsService.getJobStatus(jobId);

    if (status.error) {
      return res.status(404).json(status);
    }

    res.json(status);

  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to get job status', message: error.message });
  }
});

/**
 * POST /api/bulk/jobs/:jobId/cancel
 * Cancel a running job
 */
router.post('/jobs/:jobId/cancel', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = bulkOperationsService.cancelJob(jobId);

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json({
      message: 'Job cancelled successfully',
      jobId,
      status: result.status
    });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job', message: error.message });
  }
});

/**
 * GET /api/bulk/download/:jobId
 * Download export file from completed job
 */
router.get('/download/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobStatus = bulkOperationsService.getJobStatus(jobId);

    if (jobStatus.error) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobStatus.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Job not completed', 
        status: jobStatus.status 
      });
    }

    if (!jobStatus.exportInfo) {
      return res.status(400).json({ error: 'No export file available' });
    }

    const job = bulkOperationsService.activeJobs.get(jobId);
    if (!job || !job.exportPath) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', jobStatus.exportInfo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${jobStatus.exportInfo.filename}"`);
    res.setHeader('Content-Length', jobStatus.exportInfo.fileSize);

    // Stream the file
    const fs = await import('fs');
    const readStream = fs.createReadStream(job.exportPath);
    
    readStream.pipe(res);

    readStream.on('end', () => {
      console.log(`📥 Export downloaded: ${jobStatus.exportInfo.filename}`);
    });

    readStream.on('error', (error) => {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    });

  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({ error: 'Download failed', message: error.message });
  }
});

/**
 * GET /api/bulk/jobs
 * Get all jobs (with pagination)
 */
router.get('/jobs', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    let jobs = Array.from(bulkOperationsService.activeJobs.values());
    
    // Filter by type
    if (type) {
      jobs = jobs.filter(job => job.type === type.toUpperCase());
    }
    
    // Filter by status
    if (status) {
      jobs = jobs.filter(job => job.status === status.toUpperCase());
    }
    
    // Sort by start time (newest first)
    jobs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedJobs = jobs.slice(offset, offset + parseInt(limit));
    
    // Format response
    const formattedJobs = paginatedJobs.map(job => ({
      jobId: job.id,
      type: job.type,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      startTime: job.startTime,
      endTime: job.endTime,
      duration: job.duration,
      progress: job.totalItems > 0 ? {
        percentage: (job.processedItems / job.totalItems * 100).toFixed(1)
      } : null
    }));

    res.json({
      jobs: formattedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: jobs.length,
        pages: Math.ceil(jobs.length / parseInt(limit))
      },
      summary: {
        totalJobs: bulkOperationsService.activeJobs.size,
        byStatus: {
          PROCESSING: jobs.filter(j => j.status === 'PROCESSING').length,
          COMPLETED: jobs.filter(j => j.status === 'COMPLETED').length,
          FAILED: jobs.filter(j => j.status === 'FAILED').length,
          CANCELLED: jobs.filter(j => j.status === 'CANCELLED').length
        }
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs', message: error.message });
  }
});

/**
 * POST /api/bulk/cleanup-jobs
 * Clean up old completed jobs (admin only)
 */
router.post('/cleanup-jobs', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const cleanedCount = bulkOperationsService.cleanupOldJobs(maxAgeHours);
    
    res.json({
      message: 'Job cleanup completed',
      cleanedJobs: cleanedCount,
      remainingJobs: bulkOperationsService.activeJobs.size,
      maxAgeHours
    });

  } catch (error) {
    console.error('Cleanup jobs error:', error);
    res.status(500).json({ error: 'Job cleanup failed', message: error.message });
  }
});

/**
 * GET /api/bulk/service-status
 * Get bulk operations service status
 */
router.get('/service-status', authenticate, async (req, res) => {
  try {
    res.json({
      serviceName: 'BulkOperationsService',
      version: '1.0.0',
      status: 'running',
      activeJobs: bulkOperationsService.activeJobs.size,
      configuration: {
        maxConcurrentOperations: bulkOperationsService.maxConcurrentOperations,
        batchSize: bulkOperationsService.batchSize
      },
      capabilities: [
        'BULK_IMPORT',
        'BULK_EXPORT',
        'BULK_RULE_EXTRACTION',
        'BULK_VALIDATION',
        'BULK_STATUS_UPDATE',
        'BULK_DELETE'
      ],
      supportedExportFormats: ['json', 'csv', 'pdf', 'zip'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Service status error:', error);
    res.status(500).json({ error: 'Failed to get service status', message: error.message });
  }
});

export default router;