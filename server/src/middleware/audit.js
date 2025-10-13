import AuditService from '../services/auditService.js';

// Middleware to automatically create audit logs and versions
export const createAuditMiddleware = (entityType, options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.prisma) {
        return next();
      }

      const auditService = new AuditService(req.prisma);
      
      // Store the audit service in the request for use in route handlers
      req.auditService = auditService;
      req.auditConfig = {
        entityType,
        ...options
      };

      // Store original res.json to intercept successful responses
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Only create audit logs for successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Schedule audit log creation after response is sent
          setImmediate(async () => {
            try {
              await handlePostResponseAudit(req, res, data, auditService, entityType, options);
            } catch (error) {
              console.error('Post-response audit logging failed:', error);
            }
          });
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next(error);
    }
  };
};

// Handle audit logging after response is sent
async function handlePostResponseAudit(req, res, responseData, auditService, entityType, options) {
  try {
    const {
      trackVersions = false,
      getEntityId = null,
      getOldValues = null,
      getNewValues = null,
      actionMap = {}
    } = options;

    // Determine the action based on HTTP method and custom mapping
    let action = actionMap[req.method] || getDefaultAction(req.method);
    
    // Get entity ID from response data, params, or body
    let entityId = null;
    if (getEntityId && typeof getEntityId === 'function') {
      entityId = getEntityId(req, responseData);
    } else {
      entityId = responseData?.id || req.params?.id || req.body?.id || req.params?.contractId;
    }

    if (!entityId) {
      console.warn('Could not determine entity ID for audit logging');
      return;
    }

    // Get old and new values
    let oldValues = null;
    let newValues = null;

    if (getOldValues && typeof getOldValues === 'function') {
      oldValues = await getOldValues(req, responseData);
    }

    if (getNewValues && typeof getNewValues === 'function') {
      newValues = await getNewValues(req, responseData);
    } else if (req.method !== 'DELETE' && responseData) {
      newValues = responseData;
    }

    // Create audit log
    await auditService.createAuditLog({
      entityType,
      entityId,
      action,
      userId: req.user?.id || null,
      oldValues,
      newValues,
      metadata: {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin')
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Create version if enabled and not a DELETE operation
    if (trackVersions && req.method !== 'DELETE' && newValues) {
      const changeDescription = getChangeDescription(action, req);
      await auditService.createVersion(
        entityType,
        entityId,
        newValues,
        req.user?.id || null,
        changeDescription
      );
    }

  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Get default action based on HTTP method
function getDefaultAction(method) {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'VIEW';
    default:
      return 'UNKNOWN';
  }
}

// Generate change description
function getChangeDescription(action, req) {
  const baseDescription = {
    CREATE: 'Entity created',
    UPDATE: 'Entity updated',
    DELETE: 'Entity deleted',
    VIEW: 'Entity viewed'
  }[action] || 'Entity modified';

  // Add more context if available
  if (req.body?.changeDescription) {
    return req.body.changeDescription;
  }

  if (req.method === 'PATCH' && req.body) {
    const changedFields = Object.keys(req.body).filter(key => key !== 'id');
    if (changedFields.length > 0) {
      return `${baseDescription} - Fields modified: ${changedFields.join(', ')}`;
    }
  }

  return baseDescription;
}

// Pre-operation middleware to capture old values before changes
export const captureOldValues = (entityType, getEntity) => {
  return async (req, res, next) => {
    try {
      if (!req.prisma) {
        return next();
      }

      if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const entityId = req.params?.id || req.params?.contractId;
        
        if (entityId && getEntity && typeof getEntity === 'function') {
          const oldEntity = await getEntity(req.prisma, entityId);
          req.auditOldValues = oldEntity;
        }
      }
      
      next();
    } catch (error) {
      console.error('Failed to capture old values:', error);
      next();
    }
  };
};

// Specific audit configurations for different entity types
export const contractAuditMiddleware = createAuditMiddleware('CONTRACT', {
  trackVersions: true,
  getEntityId: (req, responseData) => {
    return responseData?.contract?.id || responseData?.id || req.params?.id;
  },
  getOldValues: async (req) => {
    return req.auditOldValues || null;
  },
  getNewValues: (req, responseData) => {
    return responseData?.contract || responseData;
  },
  actionMap: {
    POST: 'CREATE',
    PUT: 'UPDATE', 
    PATCH: 'UPDATE',
    DELETE: 'DELETE'
  }
});

export const ruleAuditMiddleware = createAuditMiddleware('LEARNED_RULE', {
  trackVersions: true,
  getEntityId: (req, responseData) => {
    return responseData?.rule?.id || responseData?.id || req.params?.ruleId;
  },
  getOldValues: async (req) => {
    return req.auditOldValues || null;
  },
  getNewValues: (req, responseData) => {
    return responseData?.rule || responseData;
  }
});

export const fileAuditMiddleware = createAuditMiddleware('UPLOADED_FILE', {
  trackVersions: false, // Files typically don't need versioning
  getEntityId: (req, responseData) => {
    return responseData?.file?.id || responseData?.id || req.params?.id;
  },
  getNewValues: (req, responseData) => {
    return responseData?.file || responseData;
  },
  actionMap: {
    POST: 'UPLOAD',
    DELETE: 'DELETE'
  }
});

export const userAuditMiddleware = createAuditMiddleware('USER', {
  trackVersions: true,
  getEntityId: (req, responseData) => {
    return responseData?.user?.id || responseData?.id || req.params?.userId;
  },
  getOldValues: async (req) => {
    return req.auditOldValues || null;
  },
  getNewValues: (req, responseData) => {
    // Don't log sensitive data like passwords
    const userData = responseData?.user || responseData;
    if (userData) {
      const { password, resetToken, ...safeData } = userData;
      return safeData;
    }
    return userData;
  }
});

// Manual audit logging helper for complex operations
export const logAuditEvent = async (req, entityType, entityId, action, options = {}) => {
  try {
    if (!req.prisma) {
      return;
    }

    const auditService = new AuditService(req.prisma);
    
    await auditService.createAuditLog({
      entityType,
      entityId,
      action,
      userId: req.user?.id || null,
      oldValues: options.oldValues || null,
      newValues: options.newValues || null,
      metadata: {
        ...options.metadata,
        manual: true,
        path: req.path,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (options.createVersion && options.versionData) {
      await auditService.createVersion(
        entityType,
        entityId,
        options.versionData,
        req.user?.id || null,
        options.changeDescription
      );
    }

  } catch (error) {
    console.error('Manual audit logging failed:', error);
  }
};

// Batch audit logging for bulk operations
export const logBatchAuditEvents = async (req, events) => {
  try {
    const auditService = new AuditService(req.prisma);
    
    for (const event of events) {
      await auditService.createAuditLog({
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        userId: req.user?.id || null,
        oldValues: event.oldValues || null,
        newValues: event.newValues || null,
        metadata: {
          ...event.metadata,
          batch: true,
          batchSize: events.length,
          path: req.path,
          method: req.method
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

  } catch (error) {
    console.error('Batch audit logging failed:', error);
  }
};

// Helper to get entity by type and ID
export const getEntityByTypeAndId = async (prisma, entityType, entityId) => {
  switch (entityType) {
    case 'CONTRACT':
      return await prisma.contract.findUnique({ where: { id: entityId } });
    case 'LEARNED_RULE':
      return await prisma.learnedRule.findUnique({ where: { id: entityId } });
    case 'UPLOADED_FILE':
      return await prisma.uploadedFile.findUnique({ where: { id: entityId } });
    case 'USER':
      const user = await prisma.user.findUnique({ where: { id: entityId } });
      if (user) {
        const { password, resetToken, ...safeUser } = user;
        return safeUser;
      }
      return null;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
};
