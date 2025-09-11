import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate as validateRequest } from '../middleware/validation.js';
import { captureTemplateInteraction } from '../middleware/learningMiddleware.js';
import { createAuditMiddleware, captureOldValues } from '../middleware/audit.js';
import templateService from '../services/templateService.js';
import { AppError } from '../middleware/errorHandler.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().required(),
  industry: Joi.string().optional(),
  systemType: Joi.string().optional(),
  isPublic: Joi.boolean().default(false),
  templateData: Joi.object().required()
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string().max(1000),
  category: Joi.string(),
  industry: Joi.string(),
  systemType: Joi.string(),
  isPublic: Joi.boolean(),
  isActive: Joi.boolean(),
  templateData: Joi.object()
}).min(1);

const contractFromTemplateSchema = Joi.object({
  customData: Joi.object().default({})
});

// Create template audit middleware
const templateAuditMiddleware = createAuditMiddleware('TEMPLATE', {
  trackVersions: true,
  getEntityId: (req, responseData) => {
    return responseData?.data?.id || responseData?.id || req.params?.id;
  },
  getOldValues: async (req) => {
    return req.auditOldValues || null;
  },
  getNewValues: (req, responseData) => {
    return responseData?.data || responseData;
  },
  actionMap: {
    POST: 'CREATE',
    PUT: 'UPDATE',
    DELETE: 'DELETE'
  }
});

// GET /api/templates - Get all templates with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      industry: req.query.industry,
      systemType: req.query.systemType,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const templates = await templateService.getTemplates(req.user.id, filters);
    
    res.json({
      success: true,
      data: templates,
      pagination: {
        total: templates.length,
        page: 1,
        limit: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'TEMPLATE_FETCH_ERROR'
      }
    });
  }
});

// GET /api/templates/stats - Get template statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await templateService.getTemplateStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'TEMPLATE_STATS_ERROR'
      }
    });
  }
});

// GET /api/templates/popular - Get popular templates
router.get('/popular', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const popularTemplates = await templateService.getPopularTemplates(limit);
    
    res.json({
      success: true,
      data: popularTemplates
    });
  } catch (error) {
    console.error('Error fetching popular templates:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'POPULAR_TEMPLATES_ERROR'
      }
    });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: statusCode === 404 ? 'TEMPLATE_NOT_FOUND' : 'TEMPLATE_FETCH_ERROR'
      }
    });
  }
});

// POST /api/templates - Create new template
router.post('/', authenticate, validateRequest(createTemplateSchema), templateAuditMiddleware, async (req, res) => {
  try {
    // Validate template data
    const validation = await templateService.validateTemplateData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Template validation failed',
          code: 'TEMPLATE_VALIDATION_ERROR',
          details: validation.errors
        }
      });
    }

    const template = await templateService.createTemplate(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'TEMPLATE_CREATION_ERROR'
      }
    });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', authenticate, captureOldValues('TEMPLATE', (prisma, id) => prisma.contractTemplate.findUnique({ where: { id } })), validateRequest(updateTemplateSchema), templateAuditMiddleware, async (req, res) => {
  try {
    // Validate template data if templateData is being updated
    if (req.body.templateData) {
      const validation = await templateService.validateTemplateData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Template validation failed',
            code: 'TEMPLATE_VALIDATION_ERROR',
            details: validation.errors
          }
        });
      }
    }

    const template = await templateService.updateTemplate(req.params.id, req.body, req.user.id);
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: statusCode === 404 ? 'TEMPLATE_NOT_FOUND' : 'TEMPLATE_UPDATE_ERROR'
      }
    });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', authenticate, captureOldValues('TEMPLATE', (prisma, id) => prisma.contractTemplate.findUnique({ where: { id } })), templateAuditMiddleware, async (req, res) => {
  try {
    const result = await templateService.deleteTemplate(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: statusCode === 404 ? 'TEMPLATE_NOT_FOUND' : 'TEMPLATE_DELETE_ERROR'
      }
    });
  }
});

// POST /api/templates/:id/duplicate - Duplicate template
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const duplicatedTemplate = await templateService.duplicateTemplate(
      req.params.id, 
      name, 
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      data: duplicatedTemplate,
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: statusCode === 404 ? 'TEMPLATE_NOT_FOUND' : 'TEMPLATE_DUPLICATE_ERROR'
      }
    });
  }
});

// POST /api/templates/:id/create-contract - Create contract from template
router.post('/:id/create-contract', 
  authenticate, 
  validateRequest(contractFromTemplateSchema),
  captureTemplateInteraction, 
  async (req, res) => {
  try {
    const { customData } = req.body;
    const contract = await templateService.createContractFromTemplate(
      req.params.id,
      customData,
      req.user.id
    );
    
    res.status(201).json({
      success: true,
      data: contract,
      message: 'Contract created from template successfully'
    });
  } catch (error) {
    console.error('Error creating contract from template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: statusCode === 404 ? 'TEMPLATE_NOT_FOUND' : 'CONTRACT_CREATION_ERROR'
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