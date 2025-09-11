/**
 * Bulk Operations Service for Contract Management
 * Handles batch processing of contract operations with progress tracking
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';
import fileService from './fileService.js';
import localTextractService from './localTextractService.js';
import aiRuleExtractionService from './aiRuleExtractionService.js';
import notificationService from './notificationService.js';

class BulkOperationsService extends EventEmitter {
  constructor() {
    super();
    this.activeJobs = new Map();
    this.jobCounter = 1;
    this.maxConcurrentOperations = parseInt(process.env.MAX_CONCURRENT_BULK_OPS || '3');
    this.batchSize = parseInt(process.env.BULK_BATCH_SIZE || '10');
  }

  /**
   * Bulk import contracts from uploaded files
   */
  async bulkImportContracts(files, options = {}, prisma, userId = null) {
    const jobId = `bulk-import-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_IMPORT',
      status: 'STARTED',
      totalItems: files.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      startTime: new Date(),
      results: [],
      errors: [],
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });
    
    // Send real-time notification for job start
    if (userId) {
      notificationService.sendToUser(userId, notificationService.NOTIFICATION_TYPES.BULK_OPERATION_STARTED, {
        operationType: 'import',
        jobId,
        itemCount: files.length,
        message: `Starting bulk import of ${files.length} contracts`
      });
    }

    // Process asynchronously
    setImmediate(async () => {
      try {
        job.status = 'PROCESSING';
        this.emit('job:processing', { jobId, job });

        // Process files in batches
        for (let i = 0; i < files.length; i += this.batchSize) {
          const batch = files.slice(i, i + this.batchSize);
          
          await Promise.all(batch.map(async (file, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            try {
              this.emit('item:processing', { 
                jobId, 
                itemIndex: globalIndex, 
                fileName: file.originalname 
              });

              // Validate file
              const validationErrors = fileService.validateFile(file, file.buffer);
              if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
              }

              // Generate unique filename
              const filename = fileService.generateUniqueFilename(file.originalname);
              
              // Save file
              const filePath = await fileService.saveFile(file.buffer, filename);
              
              // Extract content
              const extractedContent = await fileService.extractFileContent(
                file.buffer, 
                file.mimetype
              );
              
              // Analyze content
              const analysis = await fileService.analyzeFileContent(
                extractedContent, 
                file.originalname
              );

              // Create contract record
              let contractData = {
                name: file.originalname.replace(path.extname(file.originalname), ''),
                client: options.defaultClient || 'Unknown',
                status: 'DRAFT',
                createdBy: userId
              };

              // Try to extract contract details from content if AI analysis is available
              if (extractedContent.text && options.autoExtractDetails) {
                contractData = await this.extractContractDetailsFromText(
                  extractedContent.text, 
                  contractData
                );
              }

              const contract = await prisma.contract.create({
                data: contractData
              });

              // Create file upload record
              const uploadRecord = await prisma.uploadedFile.create({
                data: {
                  contractId: contract.id,
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
                  uploadedBy: userId
                }
              });

              // Extract rules if enabled
              if (options.extractRules) {
                try {
                  await aiRuleExtractionService.extractRulesFromContract(
                    contract.id, 
                    { useAI: options.useAI || false }
                  );
                } catch (ruleError) {
                  // Log but don't fail the import
                  console.warn(`Rule extraction failed for ${file.originalname}:`, ruleError.message);
                }
              }

              job.results.push({
                fileName: file.originalname,
                contractId: contract.id,
                uploadId: uploadRecord.id,
                status: 'SUCCESS',
                extractedText: extractedContent.text ? extractedContent.text.length : 0,
                confidence: analysis.confidenceScore
              });

              job.successfulItems++;
              this.emit('item:success', { 
                jobId, 
                itemIndex: globalIndex, 
                fileName: file.originalname,
                contractId: contract.id
              });

            } catch (error) {
              job.errors.push({
                fileName: file.originalname,
                error: error.message,
                index: globalIndex
              });

              job.failedItems++;
              this.emit('item:failed', { 
                jobId, 
                itemIndex: globalIndex, 
                fileName: file.originalname,
                error: error.message
              });
            }

            job.processedItems++;
            this.emit('job:progress', { 
              jobId, 
              processed: job.processedItems, 
              total: job.totalItems,
              progress: (job.processedItems / job.totalItems * 100).toFixed(1)
            });
          }));
        }

        job.status = 'COMPLETED';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();

        this.emit('job:completed', { jobId, job });

      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
        job.endTime = new Date();
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return { jobId, status: 'STARTED' };
  }

  /**
   * Bulk export contracts to various formats
   */
  async bulkExportContracts(contractIds, format = 'json', options = {}, prisma) {
    const jobId = `bulk-export-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_EXPORT',
      status: 'STARTED',
      totalItems: contractIds.length,
      processedItems: 0,
      format,
      startTime: new Date(),
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });

    setImmediate(async () => {
      try {
        job.status = 'PROCESSING';
        
        // Fetch contracts with related data
        const contracts = await prisma.contract.findMany({
          where: { id: { in: contractIds } },
          include: {
            financial: true,
            technical: true,
            operating: true,
            uploads: true,
            templates: true
          }
        });

        let exportData;
        let filename;
        let contentType;

        switch (format.toLowerCase()) {
          case 'json':
            exportData = JSON.stringify(contracts, null, 2);
            filename = `contracts-export-${Date.now()}.json`;
            contentType = 'application/json';
            break;

          case 'csv':
            exportData = await this.convertToCSV(contracts);
            filename = `contracts-export-${Date.now()}.csv`;
            contentType = 'text/csv';
            break;

          case 'pdf':
            exportData = await this.generatePDFReport(contracts);
            filename = `contracts-report-${Date.now()}.pdf`;
            contentType = 'application/pdf';
            break;

          case 'zip':
            const { buffer, filename: zipFilename } = await this.createZipArchive(contracts, prisma);
            exportData = buffer;
            filename = zipFilename;
            contentType = 'application/zip';
            break;

          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        // Save export file temporarily
        const exportDir = path.join(fileService.uploadDir, 'exports');
        await fs.mkdir(exportDir, { recursive: true });
        const exportPath = path.join(exportDir, filename);
        
        if (Buffer.isBuffer(exportData)) {
          await fs.writeFile(exportPath, exportData);
        } else {
          await fs.writeFile(exportPath, exportData, 'utf8');
        }

        job.status = 'COMPLETED';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();
        job.exportPath = exportPath;
        job.filename = filename;
        job.contentType = contentType;
        job.fileSize = (await fs.stat(exportPath)).size;

        this.emit('job:completed', { jobId, job });

      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
        job.endTime = new Date();
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return { jobId, status: 'STARTED' };
  }

  /**
   * Bulk rule extraction from multiple contracts
   */
  async bulkExtractRules(contractIds, options = {}, prisma) {
    const jobId = `bulk-rules-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_RULE_EXTRACTION',
      status: 'STARTED',
      totalItems: contractIds.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      startTime: new Date(),
      results: [],
      errors: [],
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });

    setImmediate(async () => {
      try {
        job.status = 'PROCESSING';

        // Process contracts in batches to avoid overwhelming the AI service
        for (let i = 0; i < contractIds.length; i += this.batchSize) {
          const batch = contractIds.slice(i, i + this.batchSize);
          
          await Promise.all(batch.map(async (contractId, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            try {
              this.emit('item:processing', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId 
              });

              const result = await aiRuleExtractionService.extractRulesFromContract(
                contractId, 
                {
                  useAI: options.useAI || false,
                  enableLearning: options.enableLearning !== false
                }
              );

              job.results.push({
                contractId,
                rulesExtracted: result.rulesExtracted,
                confidence: result.confidence,
                status: 'SUCCESS'
              });

              job.successfulItems++;
              this.emit('item:success', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId,
                rulesExtracted: result.rulesExtracted
              });

            } catch (error) {
              job.errors.push({
                contractId,
                error: error.message,
                index: globalIndex
              });

              job.failedItems++;
              this.emit('item:failed', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId,
                error: error.message
              });
            }

            job.processedItems++;
            this.emit('job:progress', { 
              jobId, 
              processed: job.processedItems, 
              total: job.totalItems,
              progress: (job.processedItems / job.totalItems * 100).toFixed(1)
            });
          }));
        }

        job.status = 'COMPLETED';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();

        this.emit('job:completed', { jobId, job });

      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
        job.endTime = new Date();
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return { jobId, status: 'STARTED' };
  }

  /**
   * Bulk validation of contracts against rules
   */
  async bulkValidateContracts(contractIds, ruleSetId = null, options = {}, prisma) {
    const jobId = `bulk-validate-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_VALIDATION',
      status: 'STARTED',
      totalItems: contractIds.length,
      processedItems: 0,
      validContracts: 0,
      invalidContracts: 0,
      startTime: new Date(),
      results: [],
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });

    setImmediate(async () => {
      try {
        job.status = 'PROCESSING';

        // Get validation rules
        const rules = ruleSetId 
          ? await prisma.learnedRule.findMany({ where: { id: ruleSetId } })
          : await prisma.learnedRule.findMany({ where: { isActive: true } });

        // Process contracts
        for (let i = 0; i < contractIds.length; i += this.batchSize) {
          const batch = contractIds.slice(i, i + this.batchSize);
          const contracts = await prisma.contract.findMany({
            where: { id: { in: batch } },
            include: {
              financial: true,
              technical: true,
              operating: true
            }
          });

          await Promise.all(contracts.map(async (contract, batchIndex) => {
            const globalIndex = i + batchIndex;
            
            try {
              this.emit('item:processing', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId: contract.id 
              });

              const validationResult = await this.validateContractAgainstRules(contract, rules);

              job.results.push({
                contractId: contract.id,
                contractName: contract.name,
                isValid: validationResult.isValid,
                violations: validationResult.violations,
                warnings: validationResult.warnings,
                score: validationResult.score
              });

              if (validationResult.isValid) {
                job.validContracts++;
              } else {
                job.invalidContracts++;
              }

              this.emit('item:success', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId: contract.id,
                isValid: validationResult.isValid
              });

            } catch (error) {
              this.emit('item:failed', { 
                jobId, 
                itemIndex: globalIndex, 
                contractId: contract.id,
                error: error.message
              });
            }

            job.processedItems++;
            this.emit('job:progress', { 
              jobId, 
              processed: job.processedItems, 
              total: job.totalItems,
              progress: (job.processedItems / job.totalItems * 100).toFixed(1)
            });
          }));
        }

        job.status = 'COMPLETED';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();

        this.emit('job:completed', { jobId, job });

      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
        job.endTime = new Date();
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return { jobId, status: 'STARTED' };
  }

  /**
   * Bulk update contract status
   */
  async bulkUpdateStatus(contractIds, newStatus, options = {}, prisma, userId = null) {
    const jobId = `bulk-status-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_STATUS_UPDATE',
      status: 'STARTED',
      totalItems: contractIds.length,
      processedItems: 0,
      startTime: new Date(),
      newStatus,
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });

    try {
      // Validate status
      const validStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'EXPIRED', 'TERMINATED'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Update contracts
      const updateResult = await prisma.contract.updateMany({
        where: { id: { in: contractIds } },
        data: { 
          status: newStatus,
          updatedBy: userId,
          updatedAt: new Date()
        }
      });

      // Create audit entries if enabled
      if (options.createAuditEntries !== false) {
        const auditEntries = contractIds.map(contractId => ({
          contractId,
          action: 'STATUS_UPDATE',
          details: { oldStatus: 'BULK_UPDATE', newStatus },
          performedBy: userId,
          performedAt: new Date()
        }));

        await prisma.auditLog.createMany({ data: auditEntries });
      }

      job.status = 'COMPLETED';
      job.endTime = new Date();
      job.duration = job.endTime.getTime() - job.startTime.getTime();
      job.updatedCount = updateResult.count;

      this.emit('job:completed', { jobId, job });

    } catch (error) {
      job.status = 'FAILED';
      job.error = error.message;
      job.endTime = new Date();
      
      this.emit('job:failed', { jobId, error: error.message });
    }

    return { jobId, status: job.status, updatedCount: job.updatedCount };
  }

  /**
   * Bulk delete contracts with safety checks
   */
  async bulkDeleteContracts(contractIds, options = {}, prisma, userId = null) {
    const jobId = `bulk-delete-${this.jobCounter++}-${Date.now()}`;
    
    const job = {
      id: jobId,
      type: 'BULK_DELETE',
      status: 'STARTED',
      totalItems: contractIds.length,
      processedItems: 0,
      deletedItems: 0,
      skippedItems: 0,
      startTime: new Date(),
      results: [],
      errors: [],
      options
    };
    
    this.activeJobs.set(jobId, job);
    this.emit('job:started', { jobId, job });

    setImmediate(async () => {
      try {
        job.status = 'PROCESSING';

        // Safety checks
        if (!options.bypassSafetyChecks) {
          const activeContracts = await prisma.contract.count({
            where: { 
              id: { in: contractIds }, 
              status: { in: ['ACTIVE', 'APPROVED'] }
            }
          });

          if (activeContracts > 0 && !options.allowDeleteActive) {
            throw new Error(`Cannot delete ${activeContracts} active contracts without explicit permission`);
          }
        }

        // Process contracts
        for (const contractId of contractIds) {
          try {
            this.emit('item:processing', { jobId, contractId });

            // Get contract info before deletion
            const contract = await prisma.contract.findUnique({
              where: { id: contractId },
              include: { uploads: true }
            });

            if (!contract) {
              job.skippedItems++;
              job.results.push({
                contractId,
                status: 'SKIPPED',
                reason: 'Contract not found'
              });
              continue;
            }

            // Check if contract can be deleted
            if (!options.allowDeleteActive && ['ACTIVE', 'APPROVED'].includes(contract.status)) {
              job.skippedItems++;
              job.results.push({
                contractId,
                status: 'SKIPPED',
                reason: 'Active contract - deletion not allowed'
              });
              continue;
            }

            // Delete associated files if requested
            if (options.deleteFiles && contract.uploads) {
              for (const upload of contract.uploads) {
                if (upload.filePath) {
                  try {
                    await fileService.deleteFile(upload.filePath);
                  } catch (fileError) {
                    console.warn(`Failed to delete file ${upload.filePath}:`, fileError.message);
                  }
                }
              }
            }

            // Create audit entry before deletion
            if (options.createAuditEntries !== false) {
              await prisma.auditLog.create({
                data: {
                  contractId,
                  action: 'DELETE',
                  details: { 
                    contractName: contract.name,
                    deletedBy: userId,
                    bulkOperation: true
                  },
                  performedBy: userId,
                  performedAt: new Date()
                }
              });
            }

            // Delete contract (cascading deletes will handle related records)
            await prisma.contract.delete({ where: { id: contractId } });

            job.deletedItems++;
            job.results.push({
              contractId,
              contractName: contract.name,
              status: 'DELETED'
            });

            this.emit('item:success', { jobId, contractId });

          } catch (error) {
            job.errors.push({
              contractId,
              error: error.message
            });

            this.emit('item:failed', { jobId, contractId, error: error.message });
          }

          job.processedItems++;
          this.emit('job:progress', { 
            jobId, 
            processed: job.processedItems, 
            total: job.totalItems,
            progress: (job.processedItems / job.totalItems * 100).toFixed(1)
          });
        }

        job.status = 'COMPLETED';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();

        this.emit('job:completed', { jobId, job });

      } catch (error) {
        job.status = 'FAILED';
        job.error = error.message;
        job.endTime = new Date();
        
        this.emit('job:failed', { jobId, error: error.message });
      }
    });

    return { jobId, status: 'STARTED' };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    return {
      jobId,
      type: job.type,
      status: job.status,
      progress: job.totalItems > 0 ? {
        processed: job.processedItems,
        total: job.totalItems,
        percentage: (job.processedItems / job.totalItems * 100).toFixed(1)
      } : null,
      timing: {
        startTime: job.startTime,
        endTime: job.endTime,
        duration: job.duration
      },
      results: job.results ? {
        successful: job.successfulItems,
        failed: job.failedItems,
        details: job.results.slice(0, 10) // Limit for response size
      } : null,
      errors: job.errors ? job.errors.slice(0, 5) : [], // Limit error details
      exportInfo: job.exportPath ? {
        filename: job.filename,
        contentType: job.contentType,
        fileSize: job.fileSize
      } : null
    };
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    if (!['PROCESSING', 'STARTED'].includes(job.status)) {
      return { error: 'Job cannot be cancelled' };
    }

    job.status = 'CANCELLED';
    job.endTime = new Date();
    this.emit('job:cancelled', { jobId });

    return { success: true, status: 'CANCELLED' };
  }

  /**
   * Clean up old jobs
   */
  cleanupOldJobs(maxAgeHours = 24) {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.endTime && (now - job.endTime.getTime()) > maxAge) {
        this.activeJobs.delete(jobId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Helper methods

  async extractContractDetailsFromText(text, baseData) {
    // Simple extraction - could be enhanced with AI
    const lowerText = text.toLowerCase();
    
    // Extract client name from common patterns
    const clientPatterns = [
      /client[:\s]+([a-zA-Z\s&,.-]+)/i,
      /customer[:\s]+([a-zA-Z\s&,.-]+)/i,
      /company[:\s]+([a-zA-Z\s&,.-]+)/i
    ];

    for (const pattern of clientPatterns) {
      const match = text.match(pattern);
      if (match) {
        baseData.client = match[1].trim().split('\n')[0];
        break;
      }
    }

    return baseData;
  }

  async convertToCSV(contracts) {
    const headers = [
      'ID', 'Name', 'Client', 'Status', 'Capacity', 'Term', 'Base Rate', 
      'Escalation', 'Created Date', 'Updated Date'
    ];

    const rows = contracts.map(contract => [
      contract.id,
      contract.name,
      contract.client,
      contract.status,
      contract.capacity || '',
      contract.term || '',
      contract.financial?.baseRate || '',
      contract.financial?.escalation || '',
      contract.createdAt.toISOString(),
      contract.updatedAt.toISOString()
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  async generatePDFReport(contracts) {
    // Placeholder for PDF generation
    // Would integrate with a PDF library like puppeteer or pdfkit
    return Buffer.from(`PDF Report for ${contracts.length} contracts\nGenerated: ${new Date().toISOString()}`);
  }

  async createZipArchive(contracts, prisma) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers = [];
    
    archive.on('data', (data) => buffers.push(data));
    
    // Add contracts as JSON
    archive.append(JSON.stringify(contracts, null, 2), { name: 'contracts.json' });
    
    // Add individual files if they exist
    for (const contract of contracts) {
      if (contract.uploads) {
        for (const upload of contract.uploads) {
          try {
            if (upload.filePath) {
              const fileBuffer = await fs.readFile(upload.filePath);
              archive.append(fileBuffer, { 
                name: `files/${contract.id}/${upload.originalName}` 
              });
            }
          } catch (error) {
            console.warn(`Failed to add file ${upload.originalName}:`, error.message);
          }
        }
      }
    }
    
    archive.finalize();
    
    return new Promise((resolve, reject) => {
      archive.on('end', () => {
        resolve({
          buffer: Buffer.concat(buffers),
          filename: `contracts-archive-${Date.now()}.zip`
        });
      });
      
      archive.on('error', reject);
    });
  }

  async validateContractAgainstRules(contract, rules) {
    const violations = [];
    const warnings = [];
    let score = 100;

    for (const rule of rules) {
      try {
        const result = await this.applyRuleToContract(contract, rule);
        if (!result.isValid) {
          if (result.severity === 'ERROR') {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: result.message,
              field: result.field
            });
            score -= 10;
          } else if (result.severity === 'WARNING') {
            warnings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: result.message,
              field: result.field
            });
            score -= 5;
          }
        }
      } catch (error) {
        console.warn(`Failed to apply rule ${rule.name}:`, error.message);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      score: Math.max(0, score)
    };
  }

  async applyRuleToContract(contract, rule) {
    // Simplified rule application - would be expanded based on rule types
    const ruleData = rule.ruleData || {};
    
    switch (rule.ruleType) {
      case 'RANGE':
        const value = this.getContractFieldValue(contract, rule.field);
        if (value !== null && (value < ruleData.min || value > ruleData.max)) {
          return {
            isValid: false,
            severity: 'ERROR',
            message: `${rule.field} must be between ${ruleData.min} and ${ruleData.max}`,
            field: rule.field
          };
        }
        break;
        
      case 'REQUIRED':
        const requiredValue = this.getContractFieldValue(contract, rule.field);
        if (requiredValue === null || requiredValue === undefined || requiredValue === '') {
          return {
            isValid: false,
            severity: 'ERROR',
            message: `${rule.field} is required`,
            field: rule.field
          };
        }
        break;
    }

    return { isValid: true };
  }

  getContractFieldValue(contract, fieldPath) {
    const parts = fieldPath.split('.');
    let value = contract;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  }
}

// Create and export singleton instance
const bulkOperationsService = new BulkOperationsService();
export default bulkOperationsService;