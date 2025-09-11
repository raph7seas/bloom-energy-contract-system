/**
 * Notification API Routes
 * REST endpoints for notification management
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

/**
 * GET /api/notifications/stats
 * Get notification service statistics (admin only)
 */
router.get('/stats', authenticate, authorize(['admin']), (req, res) => {
  try {
    const stats = notificationService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification stats',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/history
 * Get notification history for current user
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    
    const notifications = await notificationService.getNotificationHistory(
      userId, 
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      success: true,
      notifications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: notifications.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification history',
      error: error.message
    });
  }
});

/**
 * PATCH /api/notifications/mark-read
 * Mark notifications as read
 */
router.patch('/mark-read', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be an array'
      });
    }
    
    await notificationService.markNotificationsAsRead(userId, notificationIds);
    
    res.json({
      success: true,
      message: `Marked ${notificationIds.length} notifications as read`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/send
 * Send notification (admin only)
 */
router.post('/send', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { type, target, data, options = {} } = req.body;
    
    if (!type || !target || !data) {
      return res.status(400).json({
        success: false,
        message: 'type, target, and data are required'
      });
    }
    
    let result;
    
    switch (target.type) {
      case 'user':
        result = notificationService.sendToUser(target.userId, type, data, options);
        break;
      case 'users':
        result = notificationService.sendToUsers(target.userIds, type, data, options);
        break;
      case 'role':
        result = notificationService.sendToRole(target.role, type, data, options);
        break;
      case 'room':
        result = notificationService.sendToRoom(target.roomId, type, data, options);
        break;
      case 'broadcast':
        result = notificationService.broadcast(type, data, options);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid target type. Must be: user, users, role, room, or broadcast'
        });
    }
    
    res.json({
      success: true,
      message: 'Notification sent',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/types
 * Get available notification types
 */
router.get('/types', authenticate, (req, res) => {
  try {
    const types = notificationService.NOTIFICATION_TYPES;
    res.json({
      success: true,
      types: Object.entries(types).map(([key, value]) => ({
        key,
        value,
        description: getNotificationTypeDescription(value)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification types',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/test
 * Send test notification (admin only, development)
 */
router.post('/test', authenticate, authorize(['admin']), (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test notifications are not available in production'
      });
    }
    
    const userId = req.user.id;
    const testTypes = [
      notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT,
      notificationService.NOTIFICATION_TYPES.CONTRACT_CREATED,
      notificationService.NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED
    ];
    
    const results = [];
    
    testTypes.forEach((type, index) => {
      const result = notificationService.sendToUser(userId, type, {
        message: `Test notification ${index + 1}`,
        testData: `Test data for ${type}`,
        timestamp: new Date().toISOString()
      });
      
      results.push({ type, sent: result });
    });
    
    res.json({
      success: true,
      message: 'Test notifications sent',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test notifications',
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications/cleanup
 * Clean up old notifications and rate limits (admin only)
 */
router.delete('/cleanup', authenticate, authorize(['admin']), (req, res) => {
  try {
    notificationService.cleanupRateLimits();
    
    res.json({
      success: true,
      message: 'Notification cleanup completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications',
      error: error.message
    });
  }
});

/**
 * Helper function to get notification type descriptions
 */
function getNotificationTypeDescription(type) {
  const descriptions = {
    'contract:created': 'New contract has been created',
    'contract:updated': 'Contract has been modified',
    'contract:deleted': 'Contract has been deleted',
    'bulk:started': 'Bulk operation has started',
    'bulk:progress': 'Bulk operation progress update',
    'bulk:completed': 'Bulk operation has completed',
    'bulk:failed': 'Bulk operation has failed',
    'rule:extracted': 'New rule has been extracted',
    'rule:learned': 'New rule has been learned',
    'user:joined': 'User has connected',
    'user:left': 'User has disconnected',
    'system:alert': 'System alert or message',
    'validation:result': 'Contract validation result',
    'upload:completed': 'File upload has completed',
    'export:ready': 'Export file is ready for download'
  };
  
  return descriptions[type] || 'Unknown notification type';
}

export default router;