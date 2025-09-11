import crypto from 'crypto';

class AuditService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Create an audit log entry
  async createAuditLog(data) {
    try {
      const {
        entityType,
        entityId,
        action,
        userId,
        oldValues = null,
        newValues = null,
        metadata = {},
        ipAddress = null,
        userAgent = null
      } = data;

      // Generate a hash for the audit entry for integrity verification
      const auditHash = this.generateAuditHash({
        entityType,
        entityId,
        action,
        userId,
        oldValues,
        newValues,
        timestamp: new Date()
      });

      const auditLog = await this.prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          userId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          metadata: metadata || {},
          ipAddress,
          userAgent,
          auditHash
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  }

  // Generate hash for audit entry integrity
  generateAuditHash(data) {
    const hashData = JSON.stringify({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      timestamp: data.timestamp.toISOString()
    });
    
    return crypto.createHash('sha256').update(hashData).digest('hex');
  }

  // Create a version snapshot of an entity
  async createVersion(entityType, entityId, data, userId, changeDescription = null) {
    try {
      // Get the current highest version number
      const lastVersion = await this.prisma.entityVersion.findFirst({
        where: { entityType, entityId },
        orderBy: { versionNumber: 'desc' }
      });

      const newVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

      // Generate version hash for integrity
      const versionHash = this.generateVersionHash({
        entityType,
        entityId,
        versionNumber: newVersionNumber,
        data,
        timestamp: new Date()
      });

      const version = await this.prisma.entityVersion.create({
        data: {
          entityType,
          entityId,
          versionNumber: newVersionNumber,
          data: JSON.stringify(data),
          changeDescription,
          createdBy: userId,
          versionHash
        }
      });

      // Create audit log for version creation
      await this.createAuditLog({
        entityType,
        entityId,
        action: 'VERSION_CREATED',
        userId,
        newValues: { versionNumber: newVersionNumber, changeDescription },
        metadata: { versionId: version.id }
      });

      return version;
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  }

  // Generate hash for version integrity
  generateVersionHash(data) {
    const hashData = JSON.stringify({
      entityType: data.entityType,
      entityId: data.entityId,
      versionNumber: data.versionNumber,
      data: data.data,
      timestamp: data.timestamp.toISOString()
    });
    
    return crypto.createHash('sha256').update(hashData).digest('hex');
  }

  // Get audit trail for an entity
  async getAuditTrail(entityType, entityId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        actions = null,
        userId = null,
        startDate = null,
        endDate = null,
        includeUserDetails = true
      } = options;

      const offset = (page - 1) * limit;

      const where = {
        entityType,
        entityId
      };

      if (actions && Array.isArray(actions)) {
        where.action = { in: actions };
      }
      if (userId) {
        where.userId = userId;
      }
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [auditLogs, totalCount] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: includeUserDetails ? {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          } : false,
          orderBy: { timestamp: 'desc' },
          skip: offset,
          take: limit
        }),
        this.prisma.auditLog.count({ where })
      ]);

      return {
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          entityType: log.entityType,
          entityId: log.entityId,
          action: log.action,
          timestamp: log.timestamp,
          oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
          newValues: log.newValues ? JSON.parse(log.newValues) : null,
          metadata: log.metadata,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          auditHash: log.auditHash,
          user: log.user
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw error;
    }
  }

  // Get version history for an entity
  async getVersionHistory(entityType, entityId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        includeData = false,
        includeUserDetails = true
      } = options;

      const offset = (page - 1) * limit;

      const [versions, totalCount] = await Promise.all([
        this.prisma.entityVersion.findMany({
          where: { entityType, entityId },
          include: includeUserDetails ? {
            createdByUser: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          } : false,
          orderBy: { versionNumber: 'desc' },
          skip: offset,
          take: limit
        }),
        this.prisma.entityVersion.count({
          where: { entityType, entityId }
        })
      ]);

      return {
        versions: versions.map(version => ({
          id: version.id,
          entityType: version.entityType,
          entityId: version.entityId,
          versionNumber: version.versionNumber,
          changeDescription: version.changeDescription,
          createdAt: version.createdAt,
          versionHash: version.versionHash,
          data: includeData ? JSON.parse(version.data) : null,
          createdBy: version.createdByUser
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get version history:', error);
      throw error;
    }
  }

  // Get a specific version
  async getVersion(versionId) {
    try {
      const version = await this.prisma.entityVersion.findUnique({
        where: { id: versionId },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });

      if (!version) {
        return null;
      }

      return {
        id: version.id,
        entityType: version.entityType,
        entityId: version.entityId,
        versionNumber: version.versionNumber,
        data: JSON.parse(version.data),
        changeDescription: version.changeDescription,
        createdAt: version.createdAt,
        versionHash: version.versionHash,
        createdBy: version.createdByUser
      };
    } catch (error) {
      console.error('Failed to get version:', error);
      throw error;
    }
  }

  // Compare two versions
  async compareVersions(version1Id, version2Id) {
    try {
      const [version1, version2] = await Promise.all([
        this.getVersion(version1Id),
        this.getVersion(version2Id)
      ]);

      if (!version1 || !version2) {
        throw new Error('One or both versions not found');
      }

      if (version1.entityType !== version2.entityType || version1.entityId !== version2.entityId) {
        throw new Error('Versions must be for the same entity');
      }

      const differences = this.findDifferences(version1.data, version2.data);

      return {
        entity: {
          type: version1.entityType,
          id: version1.entityId
        },
        version1: {
          id: version1.id,
          versionNumber: version1.versionNumber,
          createdAt: version1.createdAt,
          createdBy: version1.createdBy
        },
        version2: {
          id: version2.id,
          versionNumber: version2.versionNumber,
          createdAt: version2.createdAt,
          createdBy: version2.createdBy
        },
        differences,
        summary: {
          totalChanges: differences.length,
          fieldsChanged: [...new Set(differences.map(d => d.field))]
        }
      };
    } catch (error) {
      console.error('Failed to compare versions:', error);
      throw error;
    }
  }

  // Find differences between two objects
  findDifferences(obj1, obj2, path = '') {
    const differences = [];

    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        // Recursive comparison for nested objects
        differences.push(...this.findDifferences(val1, val2, currentPath));
      } else if (val1 !== val2) {
        differences.push({
          field: currentPath,
          oldValue: val1,
          newValue: val2,
          changeType: val1 === undefined ? 'added' : (val2 === undefined ? 'removed' : 'modified')
        });
      }
    }

    return differences;
  }

  // Rollback to a specific version
  async rollbackToVersion(versionId, userId, reason = null) {
    try {
      const version = await this.getVersion(versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      // Get the current data for audit purposes
      const currentEntity = await this.getCurrentEntityData(version.entityType, version.entityId);

      // Create a new version with the rollback data
      const rollbackVersion = await this.createVersion(
        version.entityType,
        version.entityId,
        version.data,
        userId,
        `Rollback to version ${version.versionNumber}${reason ? `: ${reason}` : ''}`
      );

      // Create audit log for rollback
      await this.createAuditLog({
        entityType: version.entityType,
        entityId: version.entityId,
        action: 'ROLLBACK',
        userId,
        oldValues: currentEntity,
        newValues: version.data,
        metadata: {
          rollbackToVersionId: versionId,
          rollbackToVersionNumber: version.versionNumber,
          reason
        }
      });

      return {
        rollbackVersion,
        originalVersion: version,
        message: `Successfully rolled back to version ${version.versionNumber}`
      };
    } catch (error) {
      console.error('Failed to rollback to version:', error);
      throw error;
    }
  }

  // Get current entity data based on entity type
  async getCurrentEntityData(entityType, entityId) {
    try {
      let entity;
      
      switch (entityType) {
        case 'CONTRACT':
          entity = await this.prisma.contract.findUnique({
            where: { id: entityId }
          });
          break;
        case 'LEARNED_RULE':
          entity = await this.prisma.learnedRule.findUnique({
            where: { id: entityId }
          });
          break;
        case 'UPLOADED_FILE':
          entity = await this.prisma.uploadedFile.findUnique({
            where: { id: entityId }
          });
          break;
        case 'USER':
          entity = await this.prisma.user.findUnique({
            where: { id: entityId }
          });
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      return entity;
    } catch (error) {
      console.error('Failed to get current entity data:', error);
      throw error;
    }
  }

  // Get audit statistics
  async getAuditStatistics(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        entityTypes = null,
        actions = null
      } = options;

      const where = {};
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      
      if (entityTypes && Array.isArray(entityTypes)) {
        where.entityType = { in: entityTypes };
      }
      
      if (actions && Array.isArray(actions)) {
        where.action = { in: actions };
      }

      const [
        totalAuditLogs,
        auditLogsByEntityType,
        auditLogsByAction,
        auditLogsByUser,
        recentActivity
      ] = await Promise.all([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.groupBy({
          by: ['entityType'],
          where,
          _count: { entityType: true }
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { userId: true }
        }),
        this.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 10
        })
      ]);

      return {
        summary: {
          totalAuditLogs,
          dateRange: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
          }
        },
        byEntityType: auditLogsByEntityType.map(item => ({
          entityType: item.entityType,
          count: item._count.entityType
        })),
        byAction: auditLogsByAction.map(item => ({
          action: item.action,
          count: item._count.action
        })),
        byUser: auditLogsByUser.map(item => ({
          userId: item.userId,
          count: item._count.userId
        })),
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          entityType: log.entityType,
          entityId: log.entityId,
          action: log.action,
          timestamp: log.timestamp,
          user: log.user
        }))
      };
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  // Verify audit log integrity
  async verifyAuditIntegrity(auditLogId) {
    try {
      const auditLog = await this.prisma.auditLog.findUnique({
        where: { id: auditLogId }
      });

      if (!auditLog) {
        return { valid: false, reason: 'Audit log not found' };
      }

      const expectedHash = this.generateAuditHash({
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        userId: auditLog.userId,
        oldValues: auditLog.oldValues ? JSON.parse(auditLog.oldValues) : null,
        newValues: auditLog.newValues ? JSON.parse(auditLog.newValues) : null,
        timestamp: auditLog.timestamp
      });

      const isValid = expectedHash === auditLog.auditHash;

      return {
        valid: isValid,
        reason: isValid ? 'Audit log integrity verified' : 'Hash mismatch - audit log may have been tampered with',
        auditLogId: auditLogId,
        expectedHash,
        actualHash: auditLog.auditHash
      };
    } catch (error) {
      console.error('Failed to verify audit integrity:', error);
      return { 
        valid: false, 
        reason: `Verification failed: ${error.message}` 
      };
    }
  }
}

export default AuditService;