/**
 * Monitoring and Logging API Routes
 * Administrative endpoints for system monitoring, logs, and error tracking
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticate, authorize } from '../middleware/auth.js';
import loggingService from '../services/loggingService.js';
import errorHandlingService from '../services/errorHandlingService.js';

const router = express.Router();

/**
 * GET /api/monitoring/health
 * Health check endpoint with detailed system status
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        logging: 'active',
        errorHandling: 'active',
        database: 'connected' // TODO: Add actual DB health check
      }
    };

    // Check if system is under stress
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 90) {
      health.status = 'degraded';
      health.warnings = ['High memory usage'];
    }

    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/stats
 * System statistics and metrics (admin only)
 */
router.get('/stats', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const [logStats, errorStats] = await Promise.all([
      loggingService.getLogStats(),
      Promise.resolve(errorHandlingService.getErrorStats())
    ]);

    const systemStats = {
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      logging: logStats,
      errors: errorStats
    };

    res.json({
      success: true,
      stats: systemStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/logs
 * Retrieve log entries with filtering (admin only)
 */
router.get('/logs', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      level = 'info',
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      search
    } = req.query;

    // For now, return mock log data
    // TODO: Implement actual log parsing from files
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Sample log entry',
        service: 'bloom-contract-api',
        pid: process.pid
      }
    ];

    res.json({
      success: true,
      logs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: logs.length
      },
      filters: {
        level,
        startDate,
        endDate,
        search
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/errors
 * Error analytics and patterns (admin only)
 */
router.get('/errors', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      timeframe = '24h',
      groupBy = 'type',
      limit = 50
    } = req.query;

    const errorStats = errorHandlingService.getErrorStats();
    
    // Mock error analytics data
    const analytics = {
      timeframe,
      total_errors: errorStats.recent_errors,
      error_rate: (errorStats.recent_errors / 60).toFixed(2) + '/min',
      top_errors: Object.entries(errorStats.error_types)
        .map(([type, count]) => ({ type, count, percentage: ((count / errorStats.recent_errors) * 100).toFixed(1) + '%' }))
        .sort((a, b) => b.count - a.count)
        .slice(0, parseInt(limit)),
      patterns: errorStats,
      circuit_breakers: errorStats.active_circuit_breakers
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get error analytics',
      error: error.message
    });
  }
});

/**
 * POST /api/monitoring/test-error
 * Generate test errors for monitoring validation (admin only, development)
 */
router.post('/test-error', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test errors are not available in production'
      });
    }

    const { type = 'validation', message = 'Test error', critical = false } = req.body;
    
    let testError;
    
    switch (type) {
      case 'validation':
        testError = new Error('Test validation error');
        testError.statusCode = 400;
        break;
      case 'database':
        testError = new Error('Test database error');
        testError.code = 'P2001';
        break;
      case 'network':
        testError = new Error('Test network error');
        testError.code = 'ECONNREFUSED';
        break;
      case 'critical':
        testError = new Error('Test critical error');
        testError.statusCode = 500;
        break;
      default:
        testError = new Error(message);
    }

    // Handle the test error
    if (critical) {
      await errorHandlingService.handleCriticalError('TEST_ERROR', testError, {
        source: 'test_endpoint',
        userId: req.user.id
      });
    } else {
      await errorHandlingService.handleError(testError, {
        source: 'test_endpoint',
        userId: req.user.id,
        requestId: req.id
      });
    }

    res.json({
      success: true,
      message: `Test ${type} error generated`,
      error_type: type,
      critical
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate test error',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/performance
 * Performance metrics and slow operations (admin only)
 */
router.get('/performance', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { timeframe = '1h', operation, limit = 20 } = req.query;
    
    // Mock performance data
    const performanceData = {
      timeframe,
      avg_response_time: '150ms',
      slow_operations: [
        {
          operation: 'bulk_import',
          avg_duration: 5200,
          count: 12,
          slowest: 8500
        },
        {
          operation: 'ai_rule_extraction',
          avg_duration: 3100,
          count: 45,
          slowest: 6200
        }
      ],
      database_queries: [
        {
          operation: 'SELECT contracts',
          avg_duration: 120,
          count: 890,
          slowest: 450
        }
      ]
    };

    res.json({
      success: true,
      performance: performanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/audit
 * Audit log entries for security monitoring (admin only)
 */
router.get('/audit', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      action,
      userId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    // Mock audit data
    const auditEntries = [
      {
        timestamp: new Date().toISOString(),
        action: 'AUTH_LOGIN',
        userId: 'user-123',
        ip: '192.168.1.100',
        success: true,
        details: {
          userAgent: 'Mozilla/5.0...'
        }
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        action: 'CONTRACT_CREATED',
        userId: 'user-123',
        ip: '192.168.1.100',
        success: true,
        details: {
          contractId: 'contract-456'
        }
      }
    ];

    const filteredEntries = auditEntries.filter(entry => {
      if (action && entry.action !== action) return false;
      if (userId && entry.userId !== userId) return false;
      return true;
    });

    res.json({
      success: true,
      audit_entries: filteredEntries.slice(offset, offset + limit),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredEntries.length
      },
      filters: {
        action,
        userId,
        startDate,
        endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: error.message
    });
  }
});

/**
 * POST /api/monitoring/cleanup
 * Manual cleanup of logs and error data (admin only)
 */
router.post('/cleanup', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { 
      cleanupLogs = false, 
      cleanupErrors = true, 
      olderThanDays = 7 
    } = req.body;

    const results = {
      logs_cleaned: 0,
      errors_cleaned: 0,
      timestamp: new Date().toISOString()
    };

    if (cleanupErrors) {
      errorHandlingService.cleanup();
      results.errors_cleaned = 1; // Mock count
    }

    if (cleanupLogs) {
      loggingService.cleanup();
      results.logs_cleaned = 1; // Mock count
    }

    await loggingService.audit('SYSTEM_CLEANUP', {
      userId: req.user.id,
      cleanupLogs,
      cleanupErrors,
      olderThanDays,
      results
    });

    res.json({
      success: true,
      message: 'Cleanup completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to perform cleanup',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Active system alerts and warnings (admin only)
 */
router.get('/alerts', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const alerts = [];
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 80) {
      alerts.push({
        id: 'high-memory',
        type: 'warning',
        severity: memUsagePercent > 90 ? 'critical' : 'medium',
        message: `High memory usage: ${memUsagePercent.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        category: 'system'
      });
    }

    // Check error rates
    const errorStats = errorHandlingService.getErrorStats();
    if (errorStats.recent_errors > 50) {
      alerts.push({
        id: 'high-error-rate',
        type: 'error',
        severity: 'high',
        message: `High error rate: ${errorStats.recent_errors} errors in the last hour`,
        timestamp: new Date().toISOString(),
        category: 'errors'
      });
    }

    res.json({
      success: true,
      alerts,
      alert_count: alerts.length,
      last_check: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system alerts',
      error: error.message
    });
  }
});

export default router;