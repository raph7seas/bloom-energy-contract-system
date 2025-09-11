import Joi from 'joi';

class ValidationService {
  constructor() {
    this.schemas = {
      // Contract validation schemas
      contract: {
        create: Joi.object({
          name: Joi.string()
            .trim()
            .min(1)
            .max(255)
            .required()
            .messages({
              'string.empty': 'Contract name is required',
              'string.max': 'Contract name must be less than 255 characters'
            }),
          
          client: Joi.object({
            name: Joi.string().trim().min(1).max(255).required(),
            industry: Joi.string().trim().min(1).max(100),
            contactPerson: Joi.string().trim().max(100),
            email: Joi.string().email().max(255),
            phone: Joi.string().max(50),
            address: Joi.object({
              street: Joi.string().max(255),
              city: Joi.string().max(100),
              state: Joi.string().max(50),
              zipCode: Joi.string().max(20),
              country: Joi.string().max(50)
            })
          }).required(),

          system: Joi.object({
            solutionType: Joi.string()
              .valid('PP', 'MG', 'AMG', 'OG')
              .required()
              .messages({
                'any.only': 'Solution type must be one of: PP, MG, AMG, OG'
              }),
            capacity: Joi.number()
              .min(325)
              .max(3900)
              .multiple(325)
              .required()
              .messages({
                'number.min': 'Capacity must be at least 325 kW',
                'number.max': 'Capacity cannot exceed 3900 kW',
                'number.multiple': 'Capacity must be in multiples of 325 kW'
              }),
            reliability: Joi.string()
              .valid('3-9s', '4-9s', '5-9s')
              .required()
              .messages({
                'any.only': 'Reliability must be one of: 3-9s, 4-9s, 5-9s'
              }),
            installationType: Joi.string()
              .valid('PES', 'Ground', 'Stacked')
              .messages({
                'any.only': 'Installation type must be one of: PES, Ground, Stacked'
              })
          }).required(),

          financial: Joi.object({
            baseRate: Joi.number()
              .min(0.01)
              .max(1.00)
              .precision(4)
              .required()
              .messages({
                'number.min': 'Base rate must be greater than $0.01/kWh',
                'number.max': 'Base rate cannot exceed $1.00/kWh'
              }),
            escalation: Joi.number()
              .min(0)
              .max(10)
              .precision(2)
              .required()
              .messages({
                'number.min': 'Escalation cannot be negative',
                'number.max': 'Escalation cannot exceed 10%'
              }),
            termYears: Joi.number()
              .integer()
              .min(5)
              .max(25)
              .required()
              .messages({
                'number.min': 'Term must be at least 5 years',
                'number.max': 'Term cannot exceed 25 years'
              }),
            microgridAdder: Joi.number()
              .min(0)
              .max(0.10)
              .precision(4)
              .messages({
                'number.min': 'Microgrid adder cannot be negative',
                'number.max': 'Microgrid adder cannot exceed $0.10/kWh'
              })
          }).required(),

          technical: Joi.object({
            voltage: Joi.string()
              .valid('208V', '480V', '4.16kV', '13.2kV', '34.5kV')
              .required()
              .messages({
                'any.only': 'Voltage must be one of: 208V, 480V, 4.16kV, 13.2kV, 34.5kV'
              }),
            components: Joi.array()
              .items(Joi.string().valid('RI', 'AC', 'UC', 'BESS', 'Solar'))
              .min(1)
              .required()
              .messages({
                'array.min': 'At least one component is required',
                'any.only': 'Components must be from: RI, AC, UC, BESS, Solar'
              }),
            gridConnection: Joi.boolean().required(),
            monitoring: Joi.boolean().default(true)
          }).required(),

          operating: Joi.object({
            minDemand: Joi.number()
              .min(0)
              .required()
              .messages({
                'number.min': 'Minimum demand cannot be negative'
              }),
            maxDemand: Joi.number()
              .min(Joi.ref('minDemand'))
              .required()
              .messages({
                'number.min': 'Maximum demand must be greater than minimum demand'
              }),
            efficiencyWarranty: Joi.number()
              .min(50)
              .max(95)
              .required()
              .messages({
                'number.min': 'Efficiency warranty must be at least 50%',
                'number.max': 'Efficiency warranty cannot exceed 95%'
              }),
            outputWarranty: Joi.number()
              .min(80)
              .max(99)
              .required()
              .messages({
                'number.min': 'Output warranty must be at least 80%',
                'number.max': 'Output warranty cannot exceed 99%'
              })
          }).required()
        }),

        update: Joi.object({
          name: Joi.string().trim().min(1).max(255),
          client: Joi.object().unknown(true),
          system: Joi.object().unknown(true),
          financial: Joi.object().unknown(true),
          technical: Joi.object().unknown(true),
          operating: Joi.object().unknown(true),
          status: Joi.string().valid('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')
        }).min(1)
      },

      // User validation schemas
      user: {
        create: Joi.object({
          email: Joi.string()
            .email()
            .max(255)
            .required()
            .messages({
              'string.email': 'Please provide a valid email address',
              'string.empty': 'Email is required'
            }),
          password: Joi.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
              'string.min': 'Password must be at least 8 characters long',
              'string.pattern.base': 'Password must contain at least one uppercase letter, lowercase letter, number, and special character'
            }),
          firstName: Joi.string()
            .trim()
            .min(1)
            .max(50)
            .required()
            .messages({
              'string.empty': 'First name is required',
              'string.max': 'First name must be less than 50 characters'
            }),
          lastName: Joi.string()
            .trim()
            .min(1)
            .max(50)
            .required()
            .messages({
              'string.empty': 'Last name is required',
              'string.max': 'Last name must be less than 50 characters'
            }),
          role: Joi.string()
            .valid('USER', 'ADMIN', 'MANAGER')
            .default('USER')
            .messages({
              'any.only': 'Role must be one of: USER, ADMIN, MANAGER'
            })
        }),

        update: Joi.object({
          email: Joi.string().email().max(255),
          firstName: Joi.string().trim().min(1).max(50),
          lastName: Joi.string().trim().min(1).max(50),
          role: Joi.string().valid('USER', 'ADMIN', 'MANAGER'),
          isActive: Joi.boolean()
        }).min(1)
      },

      // File upload validation schemas
      upload: {
        validate: Joi.object({
          originalName: Joi.string().max(255).required(),
          mimetype: Joi.string()
            .valid(
              'application/pdf',
              'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
              'application/json',
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp'
            )
            .required()
            .messages({
              'any.only': 'File type not supported. Supported types: PDF, DOC, DOCX, TXT, JSON, JPG, PNG, GIF, WEBP'
            }),
          size: Joi.number()
            .max(10 * 1024 * 1024)
            .required()
            .messages({
              'number.max': 'File size cannot exceed 10MB'
            }),
          contractId: Joi.string().uuid().optional()
        })
      },

      // Authentication validation schemas
      auth: {
        login: Joi.object({
          email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'string.empty': 'Email is required'
          }),
          password: Joi.string().min(1).required().messages({
            'string.empty': 'Password is required'
          })
        }),

        register: Joi.object({
          email: Joi.string().email().max(255).required(),
          password: Joi.string().min(8).max(128).required(),
          firstName: Joi.string().trim().min(1).max(50).required(),
          lastName: Joi.string().trim().min(1).max(50).required(),
          confirmPassword: Joi.string()
            .valid(Joi.ref('password'))
            .required()
            .messages({
              'any.only': 'Passwords must match'
            })
        })
      },

      // Rule validation schemas
      rule: {
        create: Joi.object({
          ruleName: Joi.string().trim().min(1).max(255).required(),
          category: Joi.string()
            .valid('financial', 'technical', 'operating', 'system', 'legal')
            .required(),
          ruleType: Joi.string()
            .valid('RANGE', 'ENUM', 'PATTERN', 'BOOLEAN', 'CALCULATION')
            .required(),
          pattern: Joi.string().max(1000).required(),
          expectedValue: Joi.alternatives().try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.object()
          ),
          description: Joi.string().max(500)
        }),

        update: Joi.object({
          confidence: Joi.number().min(0).max(1),
          isActive: Joi.boolean(),
          description: Joi.string().max(500),
          validationRules: Joi.object(),
          metadata: Joi.object()
        }).min(1)
      }
    };
  }

  // Validate data against a specific schema
  async validate(schemaPath, data, options = {}) {
    try {
      const schema = this.getSchema(schemaPath);
      if (!schema) {
        throw new ValidationError(`Schema not found: ${schemaPath}`);
      }

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: options.stripUnknown !== false,
        allowUnknown: options.allowUnknown || false,
        ...options
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        throw new ValidationError('Validation failed', validationErrors);
      }

      return value;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Validation error: ${error.message}`);
    }
  }

  // Get schema by path (e.g., 'contract.create')
  getSchema(schemaPath) {
    const parts = schemaPath.split('.');
    let schema = this.schemas;
    
    for (const part of parts) {
      schema = schema[part];
      if (!schema) {
        return null;
      }
    }
    
    return schema;
  }

  // Validate contract business logic
  async validateContractBusinessLogic(contractData) {
    const errors = [];

    // Check system capacity constraints
    if (contractData.system) {
      const { capacity, solutionType } = contractData.system;
      
      // Capacity must be in multiples of 325kW (Bloom Energy fuel cell units)
      if (capacity && capacity % 325 !== 0) {
        errors.push({
          field: 'system.capacity',
          message: 'System capacity must be in multiples of 325 kW (standard Bloom Energy fuel cell unit)',
          value: capacity
        });
      }

      // Different solution types have different capacity constraints
      const capacityConstraints = {
        'PP': { min: 325, max: 2600 }, // Power Purchase
        'MG': { min: 650, max: 3900 }, // Microgrid
        'AMG': { min: 975, max: 3900 }, // Advanced Microgrid
        'OG': { min: 325, max: 1950 }  // On-Grid
      };

      const constraint = capacityConstraints[solutionType];
      if (constraint && capacity) {
        if (capacity < constraint.min) {
          errors.push({
            field: 'system.capacity',
            message: `${solutionType} solution requires minimum ${constraint.min} kW capacity`,
            value: capacity
          });
        }
        if (capacity > constraint.max) {
          errors.push({
            field: 'system.capacity',
            message: `${solutionType} solution cannot exceed ${constraint.max} kW capacity`,
            value: capacity
          });
        }
      }
    }

    // Check financial constraints
    if (contractData.financial) {
      const { baseRate, escalation, termYears, microgridAdder } = contractData.financial;
      
      // Base rate should be reasonable for the market
      if (baseRate && (baseRate < 0.08 || baseRate > 0.25)) {
        errors.push({
          field: 'financial.baseRate',
          message: 'Base rate should typically be between $0.08 and $0.25 per kWh',
          value: baseRate,
          severity: 'warning'
        });
      }

      // Escalation rate validation
      if (escalation && termYears) {
        const totalEscalation = Math.pow(1 + escalation / 100, termYears);
        if (totalEscalation > 2.5) {
          errors.push({
            field: 'financial.escalation',
            message: `Escalation rate of ${escalation}% over ${termYears} years results in ${((totalEscalation - 1) * 100).toFixed(1)}% total increase, which may be excessive`,
            value: escalation,
            severity: 'warning'
          });
        }
      }

      // Microgrid adder should only apply to microgrid solutions
      if (microgridAdder && microgridAdder > 0 && contractData.system?.solutionType === 'PP') {
        errors.push({
          field: 'financial.microgridAdder',
          message: 'Microgrid adder should not apply to Power Purchase agreements',
          value: microgridAdder,
          severity: 'warning'
        });
      }
    }

    // Check operating constraints
    if (contractData.operating && contractData.system) {
      const { minDemand, maxDemand, efficiencyWarranty, outputWarranty } = contractData.operating;
      const { capacity } = contractData.system;

      // Maximum demand cannot exceed system capacity
      if (maxDemand && capacity && maxDemand > capacity) {
        errors.push({
          field: 'operating.maxDemand',
          message: 'Maximum demand cannot exceed system capacity',
          value: maxDemand
        });
      }

      // Minimum demand should be reasonable percentage of capacity
      if (minDemand && capacity) {
        const minDemandPercent = (minDemand / capacity) * 100;
        if (minDemandPercent < 10) {
          errors.push({
            field: 'operating.minDemand',
            message: `Minimum demand is only ${minDemandPercent.toFixed(1)}% of capacity, which may be too low for efficient operation`,
            value: minDemand,
            severity: 'warning'
          });
        }
      }

      // Warranty validation
      if (efficiencyWarranty && outputWarranty && efficiencyWarranty > outputWarranty) {
        errors.push({
          field: 'operating.efficiencyWarranty',
          message: 'Efficiency warranty should not exceed output warranty',
          value: efficiencyWarranty,
          severity: 'warning'
        });
      }
    }

    // Check technical compatibility
    if (contractData.technical) {
      const { voltage, components, gridConnection } = contractData.technical;
      
      // Certain components require specific voltage levels
      if (components && voltage) {
        if (components.includes('BESS') && !['480V', '4.16kV'].includes(voltage)) {
          errors.push({
            field: 'technical.voltage',
            message: 'BESS components typically require 480V or 4.16kV voltage levels',
            value: voltage,
            severity: 'warning'
          });
        }
        
        if (components.includes('Solar') && !gridConnection) {
          errors.push({
            field: 'technical.gridConnection',
            message: 'Solar components typically require grid connection',
            value: gridConnection,
            severity: 'warning'
          });
        }
      }
    }

    return {
      isValid: errors.filter(e => e.severity !== 'warning').length === 0,
      errors: errors.filter(e => e.severity !== 'warning'),
      warnings: errors.filter(e => e.severity === 'warning'),
      allIssues: errors
    };
  }

  // Sanitize input data
  sanitizeInput(data) {
    if (typeof data === 'string') {
      return data.trim().replace(/[<>]/g, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  // Check for common security issues
  validateSecurity(data, options = {}) {
    const issues = [];
    const dataStr = JSON.stringify(data).toLowerCase();
    
    // Check for potential SQL injection patterns
    const sqlPatterns = [
      /(\bor\b|\band\b).*=.*=/,
      /union.*select/,
      /drop.*table/,
      /delete.*from/,
      /update.*set/
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(dataStr)) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'Potential SQL injection attempt detected',
          pattern: pattern.source
        });
      }
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script/,
      /javascript:/,
      /on\w+\s*=/,
      /<iframe/,
      /<object/,
      /<embed/
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(dataStr)) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'Potential XSS attempt detected',
          pattern: pattern.source
        });
      }
    }
    
    return {
      isSecure: issues.length === 0,
      issues
    };
  }

  // Create validation middleware
  createMiddleware(schemaPath, options = {}) {
    return async (req, res, next) => {
      try {
        // Sanitize input
        req.body = this.sanitizeInput(req.body);
        
        // Security validation
        const securityCheck = this.validateSecurity(req.body);
        if (!securityCheck.isSecure) {
          return res.status(400).json({
            error: 'Security validation failed',
            issues: securityCheck.issues
          });
        }
        
        // Schema validation
        const validatedData = await this.validate(schemaPath, req.body, options);
        req.validatedData = validatedData;
        
        // Business logic validation for contracts
        if (schemaPath.startsWith('contract.')) {
          const businessValidation = await this.validateContractBusinessLogic(validatedData);
          if (!businessValidation.isValid) {
            return res.status(400).json({
              error: 'Contract validation failed',
              errors: businessValidation.errors,
              warnings: businessValidation.warnings
            });
          }
          
          // Attach warnings to request for optional handling
          req.validationWarnings = businessValidation.warnings;
        }
        
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            error: 'Validation failed',
            details: error.errors || [{ message: error.message }]
          });
        }
        
        console.error('Validation middleware error:', error);
        res.status(500).json({
          error: 'Internal validation error',
          message: error.message
        });
      }
    };
  }
}

// Custom validation error class
class ValidationError extends Error {
  constructor(message, errors = null) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export default ValidationService;
export { ValidationError };