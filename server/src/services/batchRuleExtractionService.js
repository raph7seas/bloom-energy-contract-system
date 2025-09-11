/**
 * Batch Rule Extraction Service
 * Handles large-scale rule extraction operations across multiple contracts
 */

import AIRuleExtractionService from './aiRuleExtractionService.js';
import EventEmitter from 'events';

class BatchRuleExtractionService extends EventEmitter {
  constructor(prisma, aiService = null) {
    super();
    this.prisma = prisma;
    this.aiService = aiService;
    this.extractionService = new AIRuleExtractionService(prisma, aiService);
    
    // Batch processing configuration
    this.config = {
      batchSize: 5, // Process 5 contracts at a time
      maxConcurrent: 3, // Maximum concurrent extractions
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      progressReportInterval: 1000 // Report progress every 1 second
    };

    // Track running jobs
    this.runningJobs = new Map();
    this.jobQueue = [];
  }

  /**
   * Extract rules from all contracts in the database
   */
  async extractRulesFromAllContracts(options = {}) {
    const jobId = this.generateJobId();
    
    try {
      this.emit('job:started', { jobId, type: 'all_contracts' });
      
      // Get all contracts
      const contracts = await this.prisma.contract.findMany({
        where: options.filters || {},
        include: {
          financial: true,
          technical: true,
          operating: true,
          uploads: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return await this.processBatchExtraction(jobId, contracts, options);
    } catch (error) {
      this.emit('job:failed', { jobId, error: error.message });
      throw new Error(`Batch extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract rules from specific contracts
   */
  async extractRulesFromContracts(contractIds, options = {}) {
    const jobId = this.generateJobId();
    
    try {
      this.emit('job:started', { jobId, type: 'specific_contracts', contractCount: contractIds.length });
      
      // Get specified contracts
      const contracts = await this.prisma.contract.findMany({
        where: {
          id: { in: contractIds }
        },
        include: {
          financial: true,
          technical: true,
          operating: true,
          uploads: true
        }
      });

      if (contracts.length !== contractIds.length) {
        const found = contracts.map(c => c.id);
        const missing = contractIds.filter(id => !found.includes(id));
        console.warn(`Missing contracts: ${missing.join(', ')}`);
      }

      return await this.processBatchExtraction(jobId, contracts, options);
    } catch (error) {
      this.emit('job:failed', { jobId, error: error.message });
      throw new Error(`Batch extraction failed: ${error.message}`);
    }
  }

  /**
   * Re-extract rules for contracts with low confidence scores
   */
  async reExtractLowConfidenceRules(minConfidence = 0.6, options = {}) {
    const jobId = this.generateJobId();
    
    try {
      this.emit('job:started', { jobId, type: 'low_confidence_reextraction' });
      
      // Find contracts with low-confidence rules
      const lowConfidenceRules = await this.prisma.learnedRule.findMany({
        where: {
          confidence: { lt: minConfidence },
          isActive: true
        },
        select: {
          source: true
        },
        distinct: ['source']
      });

      // Extract contract IDs from sources
      const contractIds = lowConfidenceRules
        .map(rule => {
          const match = rule.source?.match(/contract[:\-](.+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (contractIds.length === 0) {
        this.emit('job:completed', { 
          jobId, 
          message: 'No low-confidence rules found',
          results: { processed: 0, succeeded: 0, failed: 0 }
        });
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      return await this.extractRulesFromContracts(contractIds, {
        ...options,
        reextraction: true,
        minConfidence
      });
    } catch (error) {
      this.emit('job:failed', { jobId, error: error.message });
      throw new Error(`Re-extraction failed: ${error.message}`);
    }
  }

  /**
   * Process batch extraction with progress tracking
   */
  async processBatchExtraction(jobId, contracts, options = {}) {
    const startTime = Date.now();
    const totalContracts = contracts.length;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors = [];
    const extractedRules = [];

    // Track job
    this.runningJobs.set(jobId, {
      startTime,
      totalContracts,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: 'processing'
    });

    // Start progress reporting
    const progressInterval = setInterval(() => {
      this.reportProgress(jobId);
    }, this.config.progressReportInterval);

    try {
      // Process contracts in batches
      for (let i = 0; i < contracts.length; i += this.config.batchSize) {
        const batch = contracts.slice(i, i + this.config.batchSize);
        
        // Process batch with concurrency control
        const batchPromises = batch.map(contract => 
          this.processContractWithRetry(contract, options)
            .then(result => {
              succeeded++;
              processed++;
              extractedRules.push(result);
              this.updateJobProgress(jobId, { processed, succeeded, failed });
              return result;
            })
            .catch(error => {
              failed++;
              processed++;
              errors.push({ contractId: contract.id, error: error.message });
              this.updateJobProgress(jobId, { processed, succeeded, failed });
              console.error(`Contract ${contract.id} extraction failed:`, error.message);
              return null;
            })
        );

        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + this.config.batchSize < contracts.length) {
          await this.delay(100);
        }
      }

      // Calculate processing statistics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const averageTimePerContract = processingTime / totalContracts;

      const results = {
        jobId,
        totalContracts,
        processed,
        succeeded,
        failed,
        processingTime,
        averageTimePerContract,
        totalRulesExtracted: extractedRules.reduce((sum, result) => 
          sum + (result?.rulesExtracted || 0), 0),
        errors: errors.length > 0 ? errors : undefined
      };

      // Finalize job
      this.runningJobs.delete(jobId);
      clearInterval(progressInterval);

      // Emit completion event
      this.emit('job:completed', { jobId, results });

      // Optional: Learn patterns from successful extractions
      if (options.enableLearning !== false && succeeded > 0) {
        await this.learnPatternsFromBatch(extractedRules.filter(Boolean));
      }

      return results;

    } catch (error) {
      // Clean up on error
      this.runningJobs.delete(jobId);
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * Process single contract with retry logic
   */
  async processContractWithRetry(contract, options = {}, attempt = 1) {
    try {
      const result = await this.extractionService.extractRulesFromContract(
        contract.id, 
        {
          ...options,
          useAI: options.useAI !== false, // Default to true
          reextraction: options.reextraction || false
        }
      );

      this.emit('contract:processed', {
        contractId: contract.id,
        rulesExtracted: result.rulesExtracted,
        confidence: result.confidence,
        attempt
      });

      return result;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        console.warn(`Contract ${contract.id} extraction failed (attempt ${attempt}), retrying...`);
        await this.delay(this.config.retryDelay * attempt);
        return this.processContractWithRetry(contract, options, attempt + 1);
      } else {
        throw new Error(`Contract ${contract.id} extraction failed after ${attempt} attempts: ${error.message}`);
      }
    }
  }

  /**
   * Learn patterns from successful batch extraction
   */
  async learnPatternsFromBatch(results) {
    try {
      let totalPatternsLearned = 0;
      
      for (const result of results) {
        if (result.confidence >= 0.7 && result.rules?.length > 0) {
          const highConfidenceRules = result.rules.filter(rule => rule.confidence >= 0.7);
          
          if (highConfidenceRules.length > 0) {
            await this.extractionService.learnNewPatterns(result.contractId, highConfidenceRules);
            totalPatternsLearned += highConfidenceRules.length;
          }
        }
      }

      if (totalPatternsLearned > 0) {
        this.emit('patterns:learned', { 
          rulesAnalyzed: totalPatternsLearned,
          message: `Analyzed ${totalPatternsLearned} high-confidence rules for pattern learning`
        });
      }
    } catch (error) {
      console.warn('Pattern learning from batch failed:', error.message);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.runningJobs.get(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    const currentTime = Date.now();
    const elapsedTime = currentTime - job.startTime;
    const estimatedTotal = job.processed > 0 ? 
      (elapsedTime / job.processed) * job.totalContracts : 0;
    const estimatedRemaining = estimatedTotal - elapsedTime;

    return {
      ...job,
      elapsedTime,
      estimatedRemaining: Math.max(0, estimatedRemaining),
      progress: job.totalContracts > 0 ? job.processed / job.totalContracts : 0
    };
  }

  /**
   * Get all running jobs
   */
  getRunningJobs() {
    const jobs = {};
    for (const [jobId, job] of this.runningJobs) {
      jobs[jobId] = this.getJobStatus(jobId);
    }
    return jobs;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      this.runningJobs.delete(jobId);
      this.emit('job:cancelled', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId, progress) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      Object.assign(job, progress);
    }
  }

  /**
   * Report progress for a job
   */
  reportProgress(jobId) {
    const status = this.getJobStatus(jobId);
    if (status.status !== 'not_found') {
      this.emit('job:progress', { jobId, status });
    }
  }

  /**
   * Utility: delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get extraction statistics across all processed contracts
   */
  async getBatchStatistics(options = {}) {
    try {
      const stats = await this.extractionService.getExtractionAnalytics(options);
      
      // Add batch-specific statistics
      const batchStats = {
        averageRulesPerContract: stats.totalRules > 0 ? 
          stats.totalRules / (stats.contractsProcessed || 1) : 0,
        confidenceDistribution: await this.getConfidenceDistribution(),
        categoryDistribution: await this.getCategoryDistribution(),
        extractionTrends: await this.getExtractionTrends()
      };

      return {
        ...stats,
        batchAnalytics: batchStats
      };
    } catch (error) {
      throw new Error(`Statistics generation failed: ${error.message}`);
    }
  }

  /**
   * Get confidence score distribution
   */
  async getConfidenceDistribution() {
    const confidenceRanges = [
      { label: 'Very High (0.9-1.0)', min: 0.9, max: 1.0 },
      { label: 'High (0.8-0.9)', min: 0.8, max: 0.9 },
      { label: 'Medium (0.6-0.8)', min: 0.6, max: 0.8 },
      { label: 'Low (0.4-0.6)', min: 0.4, max: 0.6 },
      { label: 'Very Low (0.0-0.4)', min: 0.0, max: 0.4 }
    ];

    const distribution = {};
    
    for (const range of confidenceRanges) {
      const count = await this.prisma.learnedRule.count({
        where: {
          confidence: {
            gte: range.min,
            lt: range.max
          },
          isActive: true
        }
      });
      
      distribution[range.label] = count;
    }

    return distribution;
  }

  /**
   * Get category distribution of extracted rules
   */
  async getCategoryDistribution() {
    const categories = await this.prisma.learnedRule.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true
    });

    return categories.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {});
  }

  /**
   * Get extraction trends over time
   */
  async getExtractionTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await this.prisma.learnedRule.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
        isActive: true
      },
      _count: true,
      orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const trendsByDay = {};
    trends.forEach(trend => {
      const day = trend.createdAt.toISOString().split('T')[0];
      trendsByDay[day] = (trendsByDay[day] || 0) + trend._count;
    });

    return trendsByDay;
  }
}

export default BatchRuleExtractionService;