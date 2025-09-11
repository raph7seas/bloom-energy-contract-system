import learningService from '../services/learningService.js';

// Middleware to automatically capture learning interactions
export const captureContractInteraction = (interactionType) => {
  return async (req, res, next) => {
    try {
      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to capture data after successful operations
      res.send = function(data) {
        captureLearningData.call(this, data, req, interactionType);
        return originalSend.call(this, data);
      };
      
      res.json = function(data) {
        captureLearningData.call(this, data, req, interactionType);
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in learning middleware:', error);
      // Don't break the request if learning fails
      next();
    }
  };
};

// Helper function to capture learning data
async function captureLearningData(responseData, req, interactionType) {
  try {
    // Only capture successful operations (2xx status codes)
    if (this.statusCode < 200 || this.statusCode >= 300) {
      return;
    }

    // Only capture if we have user information
    if (!req.user?.id) {
      return;
    }

    let contractData = null;
    let contractId = null;

    // Extract contract data from response or request
    if (responseData && typeof responseData === 'object') {
      const parsedData = typeof responseData === 'string' 
        ? JSON.parse(responseData) 
        : responseData;
      
      if (parsedData.success && parsedData.data) {
        contractData = parsedData.data;
        contractId = contractData.id;
      }
    }

    // Fallback to request body if no response data
    if (!contractData && req.body) {
      contractData = req.body;
      contractId = req.params.id || contractData.id;
    }

    if (!contractData) {
      return;
    }

    // Capture interactions for different fields
    const fieldsToLearn = [
      'capacity', 'term', 'yearlyRate', 'systemType', 
      'totalValue', 'client', 'site', 'status'
    ];

    for (const fieldName of fieldsToLearn) {
      if (contractData[fieldName] !== undefined) {
        await learningService.captureInteraction({
          type: interactionType,
          fieldName,
          oldValue: null, // For creates, or could be previous value for updates
          newValue: contractData[fieldName],
          context: {
            contractId,
            systemType: contractData.systemType,
            capacity: contractData.capacity,
            requestMethod: req.method,
            requestPath: req.path
          },
          contractId
        }, req.user.id);
      }
    }

    console.log(`Captured learning interactions for ${interactionType} on contract ${contractId}`);
  } catch (error) {
    console.error('Error capturing learning data:', error);
    // Don't throw - learning failures shouldn't break the main operation
  }
}

// Middleware to capture field validation interactions
export const captureValidationInteraction = async (req, res, next) => {
  try {
    // Store validation results in request for later capture
    req.validationResults = [];
    
    // Override validation service if available
    if (req.validationService && req.validationService.validateContract) {
      const originalValidate = req.validationService.validateContract;
      
      req.validationService.validateContract = async function(contractData, options) {
        try {
          const result = await originalValidate.call(this, contractData, options);
          
          // Capture validation interactions
          if (req.user?.id && result) {
            for (const [fieldName, value] of Object.entries(contractData)) {
              if (value !== undefined) {
                await learningService.captureInteraction({
                  type: 'FIELD_VALIDATION',
                  fieldName,
                  oldValue: null,
                  newValue: value,
                  context: {
                    validationResult: result.isValid,
                    errors: result.errors || [],
                    contractData
                  }
                }, req.user.id);
              }
            }
          }
          
          return result;
        } catch (error) {
          console.error('Error in validation learning capture:', error);
          return await originalValidate.call(this, contractData, options);
        }
      };
    }
    
    next();
  } catch (error) {
    console.error('Error in validation learning middleware:', error);
    next();
  }
};

// Middleware to capture AI suggestion interactions
export const captureAISuggestionInteraction = async (req, res, next) => {
  try {
    // Store original response methods
    const originalJson = res.json;
    
    res.json = function(data) {
      captureAISuggestionData.call(this, data, req);
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in AI suggestion middleware:', error);
    next();
  }
};

// Helper function to capture AI suggestion data
async function captureAISuggestionData(responseData, req) {
  try {
    if (this.statusCode < 200 || this.statusCode >= 300 || !req.user?.id) {
      return;
    }

    const parsedData = typeof responseData === 'string' 
      ? JSON.parse(responseData) 
      : responseData;
    
    // Look for AI suggestions in the response
    if (parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
      for (const suggestion of parsedData.suggestions) {
        if (suggestion.fieldName && suggestion.suggestedValue !== undefined) {
          await learningService.captureInteraction({
            type: 'AI_SUGGESTION_GENERATED',
            fieldName: suggestion.fieldName,
            oldValue: suggestion.currentValue,
            newValue: suggestion.suggestedValue,
            context: {
              confidence: suggestion.confidence,
              reason: suggestion.reason,
              aiModel: suggestion.model || 'unknown'
            }
          }, req.user.id);
        }
      }
    }
  } catch (error) {
    console.error('Error capturing AI suggestion data:', error);
  }
}

// Middleware to capture template usage interactions
export const captureTemplateInteraction = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = function(data) {
      captureTemplateUsageData.call(this, data, req);
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Error in template learning middleware:', error);
    next();
  }
};

// Helper function to capture template usage data
async function captureTemplateUsageData(responseData, req) {
  try {
    if (this.statusCode < 200 || this.statusCode >= 300 || !req.user?.id) {
      return;
    }

    // Capture template usage when creating contracts from templates
    if (req.path.includes('/create-contract') && req.params.id) {
      const parsedData = typeof responseData === 'string' 
        ? JSON.parse(responseData) 
        : responseData;
      
      if (parsedData.success && parsedData.data) {
        await learningService.captureInteraction({
          type: 'TEMPLATE_USE',
          fieldName: 'template',
          oldValue: null,
          newValue: req.params.id,
          context: {
            templateId: req.params.id,
            modifications: req.body.customData || {},
            createdContractId: parsedData.data.id
          }
        }, req.user.id);
      }
    }
  } catch (error) {
    console.error('Error capturing template usage data:', error);
  }
}

// Utility function to extract differences between old and new contract data
export const extractContractChanges = (oldContract, newContract) => {
  const changes = {};
  
  const fieldsToCheck = [
    'capacity', 'term', 'yearlyRate', 'systemType', 'totalValue',
    'client', 'site', 'status', 'name', 'effectiveDate'
  ];
  
  for (const field of fieldsToCheck) {
    if (oldContract[field] !== newContract[field]) {
      changes[field] = {
        oldValue: oldContract[field],
        newValue: newContract[field]
      };
    }
  }
  
  return changes;
};

export default {
  captureContractInteraction,
  captureValidationInteraction, 
  captureAISuggestionInteraction,
  captureTemplateInteraction,
  extractContractChanges
};