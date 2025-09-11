import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import AuditService from '../services/auditService.js';

const router = express.Router();

// Get audit trail for a specific entity
router.get('/trail/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const {
      page = 1,
      limit = 50,
      actions,
      userId,
      startDate,
      endDate,
      includeUserDetails = 'true'
    } = req.query;

    const auditService = new AuditService(req.prisma);
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      includeUserDetails: includeUserDetails === 'true'
    };

    if (actions) {
      options.actions = actions.split(',');
    }
    if (userId) options.userId = userId;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const auditTrail = await auditService.getAuditTrail(entityType, entityId, options);

    res.json({
      entity: { type: entityType, id: entityId },
      ...auditTrail
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve audit trail',
      message: error.message 
    });
  }
});

// Get version history for a specific entity
router.get('/versions/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const {
      page = 1,
      limit = 20,
      includeData = 'false',
      includeUserDetails = 'true'
    } = req.query;

    const auditService = new AuditService(req.prisma);
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      includeData: includeData === 'true',
      includeUserDetails: includeUserDetails === 'true'
    };

    const versionHistory = await auditService.getVersionHistory(entityType, entityId, options);

    res.json({
      entity: { type: entityType, id: entityId },
      ...versionHistory
    });
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve version history',
      message: error.message 
    });
  }
});

// Get a specific version
router.get('/versions/:versionId', authenticate, async (req, res) => {
  try {
    const { versionId } = req.params;
    const auditService = new AuditService(req.prisma);
    
    const version = await auditService.getVersion(versionId);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve version',
      message: error.message 
    });
  }
});

// Compare two versions
router.get('/versions/:version1Id/compare/:version2Id', authenticate, async (req, res) => {
  try {
    const { version1Id, version2Id } = req.params;
    const auditService = new AuditService(req.prisma);
    
    const comparison = await auditService.compareVersions(version1Id, version2Id);
    
    res.json(comparison);
  } catch (error) {
    console.error('Compare versions error:', error);
    res.status(500).json({ 
      error: 'Failed to compare versions',
      message: error.message 
    });
  }
});

// Rollback to a specific version (admin only)
router.post('/rollback/:versionId', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { versionId } = req.params;
    const { reason } = req.body;
    
    const auditService = new AuditService(req.prisma);
    const result = await auditService.rollbackToVersion(versionId, req.user.id, reason);
    
    res.json({
      message: 'Rollback completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ 
      error: 'Rollback failed',
      message: error.message 
    });
  }
});

// Get audit statistics (admin only)
router.get('/statistics', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityTypes,
      actions
    } = req.query;

    const auditService = new AuditService(req.prisma);
    
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (entityTypes) options.entityTypes = entityTypes.split(',');
    if (actions) options.actions = actions.split(',');

    const statistics = await auditService.getAuditStatistics(options);
    
    res.json(statistics);
  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve audit statistics',
      message: error.message 
    });
  }
});

// Search audit logs across all entities (admin only)
router.get('/search', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Text search in metadata or new/old values
    if (search) {
      where.OR = [
        { metadata: { path: ['$'], string_contains: search } },
        { newValues: { contains: search } },
        { oldValues: { contains: search } }
      ];
    }

    const [auditLogs, total] = await Promise.all([
      req.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      req.prisma.auditLog.count({ where })
    ]);

    const processedLogs = auditLogs.map(log => ({
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
      user: log.user
    }));

    res.json({
      auditLogs: processedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        entityType,
        entityId,
        action,
        userId,
        startDate,
        endDate,
        search
      }
    });
  } catch (error) {
    console.error('Search audit logs error:', error);
    res.status(500).json({ 
      error: 'Failed to search audit logs',
      message: error.message 
    });
  }
});

// Verify audit log integrity
router.get('/verify/:auditLogId', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const auditService = new AuditService(req.prisma);
    
    const verification = await auditService.verifyAuditIntegrity(auditLogId);
    
    res.json(verification);
  } catch (error) {
    console.error('Verify audit integrity error:', error);
    res.status(500).json({ 
      error: 'Failed to verify audit integrity',
      message: error.message 
    });
  }
});

// Bulk verify audit log integrity (admin only)
router.post('/verify/bulk', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { auditLogIds, startDate, endDate } = req.body;
    const auditService = new AuditService(req.prisma);
    
    let logsToVerify = [];
    
    if (auditLogIds && Array.isArray(auditLogIds)) {
      // Verify specific audit logs
      logsToVerify = await req.prisma.auditLog.findMany({
        where: { id: { in: auditLogIds } },
        select: { id: true }
      });
    } else if (startDate || endDate) {
      // Verify audit logs in date range
      const where = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      
      logsToVerify = await req.prisma.auditLog.findMany({
        where,
        select: { id: true },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit to prevent overwhelming the system
      });
    } else {
      return res.status(400).json({ 
        error: 'Either auditLogIds array or date range must be provided' 
      });
    }

    const verificationResults = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const log of logsToVerify) {
      const verification = await auditService.verifyAuditIntegrity(log.id);
      verificationResults.push({
        auditLogId: log.id,
        ...verification
      });
      
      if (verification.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    res.json({
      summary: {
        totalChecked: logsToVerify.length,
        valid: validCount,
        invalid: invalidCount,
        integrityScore: logsToVerify.length > 0 ? (validCount / logsToVerify.length * 100).toFixed(2) : 0
      },
      results: verificationResults
    });
  } catch (error) {
    console.error('Bulk verify audit integrity error:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk verification',
      message: error.message 
    });
  }
});

// Create manual audit log entry (admin only)
router.post('/log', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      action,
      oldValues,
      newValues,
      metadata = {},
      reason
    } = req.body;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ 
        error: 'entityType, entityId, and action are required' 
      });
    }

    const auditService = new AuditService(req.prisma);
    
    const auditLog = await auditService.createAuditLog({
      entityType,
      entityId,
      action,
      userId: req.user.id,
      oldValues,
      newValues,
      metadata: {
        ...metadata,
        manual: true,
        reason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Manual audit log created successfully',
      auditLog: {
        id: auditLog.id,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        timestamp: auditLog.timestamp,
        metadata: auditLog.metadata
      }
    });
  } catch (error) {
    console.error('Create manual audit log error:', error);
    res.status(500).json({ 
      error: 'Failed to create manual audit log',
      message: error.message 
    });
  }
});

// Get user activity summary
router.get('/user/:userId/activity', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      startDate,
      endDate,
      entityType,
      limit = 50
    } = req.query;

    // Check if user can view this activity (admin or own activity)
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where = { userId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    if (entityType) where.entityType = entityType;

    const [activityLogs, summary] = await Promise.all([
      req.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          timestamp: true,
          metadata: true
        },
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit)
      }),
      req.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      })
    ]);

    const totalActivities = await req.prisma.auditLog.count({ where });

    res.json({
      userId,
      summary: {
        totalActivities,
        recentActivities: activityLogs.length,
        actionBreakdown: summary.map(s => ({
          action: s.action,
          count: s._count.action
        }))
      },
      recentActivity: activityLogs,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user activity',
      message: error.message 
    });
  }
});

// Health check for audit service
router.get('/health', async (req, res) => {
  try {
    const [totalAuditLogs, totalVersions] = await Promise.all([
      req.prisma.auditLog.count(),
      req.prisma.entityVersion.count()
    ]);

    const recentActivity = await req.prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });

    res.json({
      status: 'healthy',
      service: 'Audit Service',
      timestamp: new Date().toISOString(),
      statistics: {
        totalAuditLogs,
        totalVersions,
        lastActivity: recentActivity?.timestamp || null
      }
    });
  } catch (error) {
    console.error('Audit health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      service: 'Audit Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;