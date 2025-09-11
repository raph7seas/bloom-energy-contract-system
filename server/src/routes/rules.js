import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import RuleExtractionService from '../services/ruleExtractionService.js';
import AIRuleExtractionService from '../services/aiRuleExtractionService.js';
import BatchRuleExtractionService from '../services/batchRuleExtractionService.js';
import aiService from '../services/aiIntegrationService.js';

const router = express.Router();

// Extract rules from a specific contract
router.post('/extract/:contractId', authenticate, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { options = {} } = req.body;
    
    const ruleExtractionService = new RuleExtractionService(req.prisma);
    const result = await ruleExtractionService.extractRulesFromContract(contractId, options);
    
    res.json({
      message: 'Rules extracted successfully',
      contractId,
      extractedRules: result.extractedRules,
      updatedRules: result.updatedRules,
      newRules: result.newRules,
      statistics: {
        totalExtracted: result.extractedRules.length,
        newRulesCreated: result.newRules,
        rulesUpdated: result.updatedRules
      }
    });
  } catch (error) {
    console.error('Rule extraction error:', error);
    res.status(500).json({ 
      error: 'Rule extraction failed',
      message: error.message 
    });
  }
});

// Validate a contract against learned rules
router.post('/validate/:contractId', authenticate, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { thresholds = {} } = req.body;
    
    const ruleExtractionService = new RuleExtractionService(req.prisma);
    const validation = await ruleExtractionService.validateContract(contractId, thresholds);
    
    res.json({
      contractId,
      validation: {
        isValid: validation.isValid,
        confidence: validation.confidence,
        violations: validation.violations,
        warnings: validation.warnings,
        summary: {
          totalViolations: validation.violations.length,
          totalWarnings: validation.warnings.length,
          overallConfidence: validation.confidence
        }
      }
    });
  } catch (error) {
    console.error('Contract validation error:', error);
    res.status(500).json({ 
      error: 'Contract validation failed',
      message: error.message 
    });
  }
});

// Get rule statistics and analytics
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const { 
      category, 
      ruleType, 
      minConfidence, 
      startDate, 
      endDate,
      includeInactive = false 
    } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (ruleType) filters.ruleType = ruleType;
    if (minConfidence) filters.minConfidence = parseFloat(minConfidence);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const ruleExtractionService = new RuleExtractionService(req.prisma);
    const statistics = await ruleExtractionService.getRuleStatistics(filters, includeInactive === 'true');
    
    res.json({
      statistics,
      filters: {
        ...filters,
        includeInactive: includeInactive === 'true'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rule statistics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve rule statistics',
      message: error.message 
    });
  }
});

// Get all learned rules with filtering and pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      ruleType, 
      minConfidence = 0,
      maxConfidence = 1,
      active,
      search,
      sortBy = 'confidence',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {
      confidence: {
        gte: parseFloat(minConfidence),
        lte: parseFloat(maxConfidence)
      }
    };
    
    if (category) where.category = category;
    if (ruleType) where.ruleType = ruleType;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { ruleName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [rules, total] = await Promise.all([
      req.prisma.learnedRule.findMany({
        where,
        include: {
          _count: {
            select: { sourceContracts: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: parseInt(limit)
      }),
      req.prisma.learnedRule.count({ where })
    ]);

    const processedRules = rules.map(rule => ({
      id: rule.id,
      ruleName: rule.ruleName,
      category: rule.category,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      confidence: rule.confidence,
      occurrences: rule.occurrences,
      sourceContractsCount: rule._count.sourceContracts,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      description: rule.description
    }));

    res.json({
      rules: processedRules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        category,
        ruleType,
        minConfidence: parseFloat(minConfidence),
        maxConfidence: parseFloat(maxConfidence),
        active,
        search
      },
      sorting: { sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve rules',
      message: error.message 
    });
  }
});

// Get a specific rule by ID
router.get('/:ruleId', authenticate, async (req, res) => {
  try {
    const rule = await req.prisma.learnedRule.findUnique({
      where: { id: req.params.ruleId },
      include: {
        sourceContracts: {
          include: {
            contract: {
              select: { id: true, name: true, client: true, createdAt: true }
            }
          }
        },
        _count: {
          select: { sourceContracts: true }
        }
      }
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      id: rule.id,
      ruleName: rule.ruleName,
      category: rule.category,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
      expectedValue: rule.expectedValue,
      confidence: rule.confidence,
      occurrences: rule.occurrences,
      isActive: rule.isActive,
      description: rule.description,
      validationRules: rule.validationRules,
      metadata: rule.metadata,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      sourceContracts: rule.sourceContracts.map(sc => ({
        contractId: sc.contractId,
        extractedValue: sc.extractedValue,
        confidence: sc.confidence,
        extractedAt: sc.extractedAt,
        contract: sc.contract
      })),
      statistics: {
        totalSourceContracts: rule._count.sourceContracts,
        averageConfidence: rule.confidence,
        lastUpdated: rule.updatedAt
      }
    });
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve rule',
      message: error.message 
    });
  }
});

// Update rule configuration (admin only)
router.patch('/:ruleId', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { 
      isActive, 
      confidence, 
      description, 
      validationRules,
      metadata 
    } = req.body;

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof confidence === 'number') updateData.confidence = confidence;
    if (description !== undefined) updateData.description = description;
    if (validationRules !== undefined) updateData.validationRules = validationRules;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updatedRule = await req.prisma.learnedRule.update({
      where: { id: ruleId },
      data: updateData,
      include: {
        _count: {
          select: { sourceContracts: true }
        }
      }
    });

    res.json({
      message: 'Rule updated successfully',
      rule: {
        id: updatedRule.id,
        ruleName: updatedRule.ruleName,
        category: updatedRule.category,
        ruleType: updatedRule.ruleType,
        confidence: updatedRule.confidence,
        isActive: updatedRule.isActive,
        description: updatedRule.description,
        sourceContractsCount: updatedRule._count.sourceContracts,
        updatedAt: updatedRule.updatedAt
      }
    });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ 
      error: 'Failed to update rule',
      message: error.message 
    });
  }
});

// Delete a rule (admin only)
router.delete('/:ruleId', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { ruleId } = req.params;

    // Check if rule exists and get source contracts count
    const rule = await req.prisma.learnedRule.findUnique({
      where: { id: ruleId },
      include: {
        _count: {
          select: { sourceContracts: true }
        }
      }
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Delete related source contract records first
    await req.prisma.ruleSourceContract.deleteMany({
      where: { ruleId }
    });

    // Delete the rule
    await req.prisma.learnedRule.delete({
      where: { id: ruleId }
    });

    res.json({
      message: 'Rule deleted successfully',
      deletedRule: {
        id: rule.id,
        ruleName: rule.ruleName,
        category: rule.category,
        sourceContractsCount: rule._count.sourceContracts
      }
    });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ 
      error: 'Failed to delete rule',
      message: error.message 
    });
  }
});

// Batch extract rules from multiple contracts
router.post('/extract/batch', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { contractIds, options = {} } = req.body;
    
    if (!Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: 'Contract IDs array is required' });
    }

    const ruleExtractionService = new RuleExtractionService(req.prisma);
    const results = [];
    const errors = [];

    for (const contractId of contractIds) {
      try {
        const result = await ruleExtractionService.extractRulesFromContract(contractId, options);
        results.push({
          contractId,
          success: true,
          extractedRules: result.extractedRules.length,
          updatedRules: result.updatedRules,
          newRules: result.newRules
        });
      } catch (error) {
        errors.push({
          contractId,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Batch rule extraction completed',
      summary: {
        totalContracts: contractIds.length,
        successful: results.length,
        failed: errors.length,
        totalRulesExtracted: results.reduce((sum, r) => sum + r.extractedRules, 0),
        totalNewRules: results.reduce((sum, r) => sum + r.newRules, 0),
        totalUpdatedRules: results.reduce((sum, r) => sum + r.updatedRules, 0)
      },
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Batch rule extraction error:', error);
    res.status(500).json({ 
      error: 'Batch rule extraction failed',
      message: error.message 
    });
  }
});

// Get rule categories and types for filtering
router.get('/meta/categories', authenticate, async (req, res) => {
  try {
    const categories = await req.prisma.learnedRule.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    const ruleTypes = await req.prisma.learnedRule.groupBy({
      by: ['ruleType'],
      _count: {
        ruleType: true
      },
      orderBy: {
        _count: {
          ruleType: 'desc'
        }
      }
    });

    res.json({
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.category
      })),
      ruleTypes: ruleTypes.map(rt => ({
        name: rt.ruleType,
        count: rt._count.ruleType
      }))
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve metadata',
      message: error.message 
    });
  }
});

// Health check for rule extraction service
router.get('/health/check', async (req, res) => {
  try {
    const ruleExtractionService = new RuleExtractionService(req.prisma);
    
    // Test database connectivity
    const totalRules = await req.prisma.learnedRule.count();
    const activeRules = await req.prisma.learnedRule.count({
      where: { isActive: true }
    });

    res.json({
      status: 'healthy',
      service: 'Rule Extraction Service',
      timestamp: new Date().toISOString(),
      statistics: {
        totalRules,
        activeRules,
        inactiveRules: totalRules - activeRules
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      service: 'Rule Extraction Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== ENHANCED AI AND BATCH EXTRACTION ENDPOINTS ==========

// AI-Enhanced Rule Extraction
router.post('/extract/:contractId/ai', authenticate, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { options = {} } = req.body;
    
    const aiRuleExtractionService = new AIRuleExtractionService(req.prisma, aiService);
    const result = await aiRuleExtractionService.extractRulesFromContract(contractId, {
      ...options,
      useAI: true
    });
    
    res.json({
      message: 'AI-enhanced rules extracted successfully',
      contractId,
      results: result,
      aiEnhancements: result.aiEnhancements,
      anomalies: result.anomalies
    });
  } catch (error) {
    console.error('AI rule extraction error:', error);
    res.status(500).json({ 
      error: 'AI rule extraction failed',
      message: error.message 
    });
  }
});

// Batch Rule Extraction - All Contracts
router.post('/batch/extract-all', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { filters = {}, options = {} } = req.body;
    
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    
    // Start async processing
    const promise = batchService.extractRulesFromAllContracts({
      filters,
      ...options
    });
    
    // Return job information immediately
    promise.then(results => {
      console.log('Batch extraction completed:', results);
    }).catch(error => {
      console.error('Batch extraction failed:', error);
    });
    
    res.json({
      message: 'Batch rule extraction started',
      status: 'processing',
      note: 'This is an async operation. Use /rules/batch/status to monitor progress'
    });
  } catch (error) {
    console.error('Batch extraction error:', error);
    res.status(500).json({ 
      error: 'Batch rule extraction failed',
      message: error.message 
    });
  }
});

// Batch Rule Extraction - Specific Contracts
router.post('/batch/extract', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { contractIds, options = {} } = req.body;
    
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({
        error: 'Contract IDs required',
        message: 'Please provide an array of contract IDs to process'
      });
    }
    
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const results = await batchService.extractRulesFromContracts(contractIds, options);
    
    res.json({
      message: 'Batch rule extraction completed',
      results
    });
  } catch (error) {
    console.error('Batch extraction error:', error);
    res.status(500).json({ 
      error: 'Batch rule extraction failed',
      message: error.message 
    });
  }
});

// Re-extract Low Confidence Rules
router.post('/batch/reextract-low-confidence', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { minConfidence = 0.6, options = {} } = req.body;
    
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const results = await batchService.reExtractLowConfidenceRules(minConfidence, options);
    
    res.json({
      message: 'Low-confidence rules re-extraction completed',
      minConfidence,
      results
    });
  } catch (error) {
    console.error('Re-extraction error:', error);
    res.status(500).json({ 
      error: 'Re-extraction failed',
      message: error.message 
    });
  }
});

// Get Batch Job Status
router.get('/batch/jobs', authenticate, async (req, res) => {
  try {
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const jobs = batchService.getRunningJobs();
    
    res.json({
      runningJobs: jobs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve job status',
      message: error.message 
    });
  }
});

// Get Specific Job Status
router.get('/batch/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const jobStatus = batchService.getJobStatus(jobId);
    
    if (jobStatus.status === 'not_found') {
      return res.status(404).json({
        error: 'Job not found',
        jobId
      });
    }
    
    res.json({
      jobId,
      status: jobStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve job status',
      message: error.message 
    });
  }
});

// Cancel Batch Job
router.delete('/batch/jobs/:jobId', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const cancelled = await batchService.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(404).json({
        error: 'Job not found or cannot be cancelled',
        jobId
      });
    }
    
    res.json({
      message: 'Job cancelled successfully',
      jobId
    });
  } catch (error) {
    console.error('Job cancellation error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel job',
      message: error.message 
    });
  }
});

// Get Batch Statistics and Analytics
router.get('/batch/analytics', authenticate, async (req, res) => {
  try {
    const { days = 30, includeInactive = false } = req.query;
    
    const batchService = new BatchRuleExtractionService(req.prisma, aiService);
    const analytics = await batchService.getBatchStatistics({
      days: parseInt(days),
      includeInactive: includeInactive === 'true'
    });
    
    res.json({
      analytics,
      parameters: { days: parseInt(days), includeInactive: includeInactive === 'true' },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve batch analytics',
      message: error.message 
    });
  }
});

// Pattern Learning Endpoint
router.post('/patterns/learn/:contractId', authenticate, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { validatedRules } = req.body;
    
    if (!validatedRules || !Array.isArray(validatedRules)) {
      return res.status(400).json({
        error: 'Validated rules required',
        message: 'Please provide an array of validated rules for pattern learning'
      });
    }
    
    const aiRuleExtractionService = new AIRuleExtractionService(req.prisma, aiService);
    await aiRuleExtractionService.learnNewPatterns(contractId, validatedRules);
    
    res.json({
      message: 'Pattern learning completed',
      contractId,
      rulesAnalyzed: validatedRules.length
    });
  } catch (error) {
    console.error('Pattern learning error:', error);
    res.status(500).json({ 
      error: 'Pattern learning failed',
      message: error.message 
    });
  }
});

// Get AI Extraction Analytics
router.get('/ai/analytics', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const aiRuleExtractionService = new AIRuleExtractionService(req.prisma, aiService);
    const analytics = await aiRuleExtractionService.getExtractionAnalytics({
      days: parseInt(days)
    });
    
    res.json({
      analytics,
      parameters: { days: parseInt(days) },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve AI analytics',
      message: error.message 
    });
  }
});

export default router;