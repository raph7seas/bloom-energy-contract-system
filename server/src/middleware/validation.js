/**
 * Validation Middleware for Contract API
 * Provides request validation for all contract operations
 */

import Joi from 'joi';

// Contract validation schema
const contractSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  client: Joi.string().min(1).max(200).required(),
  capacity: Joi.number().min(325).max(100000).multiple(325).required(),
  term: Joi.number().valid(5, 10, 15, 20).required(),
  financial: Joi.object({
    baseRate: Joi.number().min(0).max(1).required(),
    escalation: Joi.number().min(0).max(10).required(),
    netPresentValue: Joi.number().optional(),
    totalContractValue: Joi.number().optional()
  }).optional(),
  technical: Joi.object({
    voltage: Joi.string().valid('208V', '480V', '4.16kV', '13.2kV', '34.5kV').optional(),
    components: Joi.array().items(Joi.string().valid('RI', 'AC', 'UC', 'BESS', 'Solar')).optional()
  }).optional(),
  operating: Joi.object({
    outputWarranty: Joi.number().min(80).max(100).optional(),
    availability: Joi.number().min(90).max(100).optional()
  }).optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED').optional()
});

// Financial calculation validation schema
const financialCalculationSchema = Joi.object({
  capacity: Joi.number().min(325).max(100000).multiple(325).required(),
  baseRate: Joi.number().min(0).max(1).required(),
  escalation: Joi.number().min(0).max(10).required(),
  term: Joi.number().valid(5, 10, 15, 20).required(),
  downPayment: Joi.number().min(0).optional(),
  discountRate: Joi.number().min(0).max(20).optional()
});

// Search query validation schema
const searchQuerySchema = Joi.object({
  query: Joi.string().max(200).optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED').optional(),
  client: Joi.string().max(200).optional(),
  minCapacity: Joi.number().min(0).optional(),
  maxCapacity: Joi.number().min(0).optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional()
});

// Template validation schema
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid('standard', 'custom', 'industry').optional(),
  defaults: Joi.object().optional(),
  rules: Joi.array().items(Joi.object()).optional()
});

// Upload file validation
const validateFileUpload = (req, res, next) => {
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
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'No file uploaded',
        statusCode: 400
      }
    });
  }

  // Handle both single and multiple file uploads
  const filesToCheck = req.files ? req.files : [req.file].filter(Boolean);

  for (const file of filesToCheck) {
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid file type: ${file.mimetype}. Supported types: PDF, DOC, DOCX, TXT, JSON, JPG, PNG, GIF, WEBP`,
          statusCode: 400
        }
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File "${file.originalname}" is too large. Maximum size is 10MB.`,
          statusCode: 400
        }
      });
    }
  }

  next();
};

// Generic validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          statusCode: 400,
          details
        }
      });
    }

    next();
  };
};

// Query validation middleware factory
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Query validation failed',
          statusCode: 400,
          details
        }
      });
    }

    next();
  };
};

// Parameter validation middleware
const validateParams = (paramSchema) => {
  return (req, res, next) => {
    const { error } = paramSchema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Parameter validation failed',
          statusCode: 400,
          details
        }
      });
    }

    next();
  };
};

// Contract ID validation
const contractIdSchema = Joi.object({
  id: Joi.string().required()
});

// Export validation middleware functions
export {
  validate,
  validateQuery,
  validateParams,
  validateFileUpload,
  contractSchema,
  financialCalculationSchema,
  searchQuerySchema,
  templateSchema,
  contractIdSchema
};

// Default export for backward compatibility
export default {
  validate,
  validateQuery,
  validateParams,
  validateFileUpload,
  contractSchema,
  financialCalculationSchema,
  searchQuerySchema,
  templateSchema,
  contractIdSchema
};