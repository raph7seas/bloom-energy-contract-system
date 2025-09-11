import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate as validateRequest } from '../middleware/validation.js';
import learningService from '../services/learningService.js';
import { AppError } from '../middleware/errorHandler.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const captureInteractionSchema = Joi.object({
  type: Joi.string().valid(
    'CONTRACT_CREATE',
    'CONTRACT_UPDATE', 
    'FIELD_VALIDATION',
    'USER_CORRECTION',
    'TEMPLATE_USE',
    'AI_SUGGESTION_ACCEPTED',
    'AI_SUGGESTION_REJECTED'
  ).required(),
  fieldName: Joi.string().required(),
  oldValue: Joi.any().allow(null),
  newValue: Joi.any().required(),
  context: Joi.object().default({}),
  contractId: Joi.string().optional()
});

const cleanupRulesSchema = Joi.object({
  threshold: Joi.number().min(0).max(1).default(0.2)
});

// POST /api/learning/interactions - Capture user interaction for learning
router.post('/interactions', authenticate, validateRequest(captureInteractionSchema), async (req, res) => {
  try {
    const result = await learningService.captureInteraction(req.body, req.user.id);
    
    res.json({
      success: true,
      data: result,
      message: 'User interaction captured successfully'
    });
  } catch (error) {
    console.error('Error capturing interaction:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INTERACTION_CAPTURE_ERROR'
      }
    });
  }
});

// GET /api/learning/stats - Get learning system statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await learningService.getLearningStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'LEARNING_STATS_ERROR'
      }
    });
  }
});

// GET /api/learning/rules - Get learned rules with filtering
router.get('/rules', authenticate, async (req, res) => {
  try {
    const {
      category,
      ruleType,
      minConfidence,
      isActive = 'true',
      sortBy = 'confidence',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter conditions
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (ruleType) {
      where.ruleType = ruleType;
    }
    
    if (minConfidence) {
      where.confidence = { gte: parseFloat(minConfidence) };
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Build sorting
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const rules = await req.prisma.learnedRule.findMany({
      where,
      orderBy,
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        _count: {
          select: {
            // Add any related counts if needed
          }
        }
      }
    });

    const totalCount = await req.prisma.learnedRule.count({ where });

    res.json({
      success: true,
      data: rules,
      pagination: {
        total: totalCount,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching learned rules:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'LEARNED_RULES_FETCH_ERROR'
      }
    });
  }
});

// GET /api/learning/rules/:id - Get specific learned rule
router.get('/rules/:id', authenticate, async (req, res) => {
  try {
    const rule = await req.prisma.learnedRule.findUnique({
      where: { id: req.params.id },
      include: {
        // Include any related data if needed
      }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Learned rule not found',
          code: 'RULE_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error fetching learned rule:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'RULE_FETCH_ERROR'
      }
    });
  }
});

// PUT /api/learning/rules/:id - Update learned rule (manual adjustment)
router.put('/rules/:id', authenticate, async (req, res) => {
  try {
    const { confidence, isActive, ruleData } = req.body;
    
    const updateData = {};
    
    if (confidence !== undefined) {
      if (confidence < 0 || confidence > 1) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Confidence must be between 0 and 1',
            code: 'INVALID_CONFIDENCE'
          }
        });
      }
      updateData.confidence = confidence;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    if (ruleData) {
      updateData.ruleData = ruleData;
    }

    updateData.updatedAt = new Date();

    const updatedRule = await req.prisma.learnedRule.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedRule,
      message: 'Learned rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating learned rule:', error);
    const statusCode = error.code === 'P2025' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: statusCode === 404 ? 'Learned rule not found' : error.message,
        code: statusCode === 404 ? 'RULE_NOT_FOUND' : 'RULE_UPDATE_ERROR'
      }
    });
  }
});

// DELETE /api/learning/rules/:id - Delete (deactivate) learned rule
router.delete('/rules/:id', authenticate, async (req, res) => {
  try {
    const updatedRule = await req.prisma.learnedRule.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Learned rule deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating learned rule:', error);
    const statusCode = error.code === 'P2025' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: statusCode === 404 ? 'Learned rule not found' : error.message,
        code: statusCode === 404 ? 'RULE_NOT_FOUND' : 'RULE_DELETE_ERROR'
      }
    });
  }
});

// POST /api/learning/cleanup - Cleanup low-confidence rules
router.post('/cleanup', authenticate, validateRequest(cleanupRulesSchema), async (req, res) => {
  try {
    const { threshold } = req.body;
    const result = await learningService.cleanupLowConfidenceRules(threshold);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Error cleaning up rules:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'CLEANUP_ERROR'
      }
    });
  }
});

// GET /api/learning/suggestions - Get AI suggestions based on learned rules
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { fieldName, currentValue, contractData } = req.query;
    
    if (!fieldName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'fieldName parameter is required',
          code: 'MISSING_FIELD_NAME'
        }
      });
    }

    // Find applicable rules for this field
    const applicableRules = await learningService.findApplicableRules(
      fieldName, 
      currentValue, 
      JSON.parse(contractData || '{}')
    );

    // Generate suggestions based on rules
    const suggestions = [];
    
    for (const rule of applicableRules) {
      if (rule.confidence >= 0.7) { // Only high-confidence rules
        const suggestion = {
          ruleId: rule.id,
          ruleName: rule.name,
          confidence: rule.confidence,
          suggestion: rule.ruleData.description,
          validationLogic: rule.ruleData.validationLogic,
          examples: rule.ruleData.examples
        };
        
        // Add specific suggestions based on rule type
        if (rule.ruleType === 'RANGE' && rule.ruleData.validationLogic) {
          const logic = rule.ruleData.validationLogic;
          if (logic.minValue !== undefined && logic.maxValue !== undefined) {
            suggestion.recommendedRange = {
              min: logic.minValue,
              max: logic.maxValue,
              unit: logic.unit
            };
          }
        }
        
        if (rule.ruleType === 'ENUM' && rule.ruleData.validationLogic?.allowedValues) {
          suggestion.recommendedValues = rule.ruleData.validationLogic.allowedValues;
        }
        
        suggestions.push(suggestion);
      }
    }

    res.json({
      success: true,
      data: {
        fieldName,
        currentValue,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence)
      }
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'SUGGESTIONS_ERROR'
      }
    });
  }
});

// POST /api/learning/bulk-interactions - Capture multiple interactions at once
router.post('/bulk-interactions', authenticate, async (req, res) => {
  try {
    const { interactions } = req.body;
    
    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'interactions must be a non-empty array',
          code: 'INVALID_INTERACTIONS_ARRAY'
        }
      });
    }

    const results = [];
    const errors = [];

    // Process each interaction
    for (let i = 0; i < interactions.length; i++) {
      try {
        const interaction = interactions[i];
        const result = await learningService.captureInteraction(interaction, req.user.id);
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        processed: results.length,
        total: interactions.length,
        results,
        errors
      },
      message: `Processed ${results.length}/${interactions.length} interactions successfully`
    });
  } catch (error) {
    console.error('Error processing bulk interactions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'BULK_INTERACTIONS_ERROR'
      }
    });
  }
});

// Add timestamp to all responses
router.use((req, res, next) => {
  const originalSend = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      data.timestamp = new Date().toISOString();
    }
    return originalSend.call(this, data);
  };
  next();
});

export default router;