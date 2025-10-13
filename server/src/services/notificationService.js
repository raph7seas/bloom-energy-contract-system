/**
 * Real-time Notification Service
 * Manages WebSocket connections and real-time notifications for the contract management system
 */

import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // userId -> socket connections
    this.rooms = new Map(); // roomId -> Set of socket connections
    this.userSessions = new Map(); // userId -> Set of socket ids
    this.notificationQueue = new Map(); // userId -> notification queue for offline users
    this.io = null;
    
    // Notification types
    this.NOTIFICATION_TYPES = {
      CONTRACT_CREATED: 'contract:created',
      CONTRACT_UPDATED: 'contract:updated',
      CONTRACT_DELETED: 'contract:deleted',
      BULK_OPERATION_STARTED: 'bulk:started',
      BULK_OPERATION_PROGRESS: 'bulk:progress',
      BULK_OPERATION_COMPLETED: 'bulk:completed',
      BULK_OPERATION_FAILED: 'bulk:failed',
      RULE_EXTRACTED: 'rule:extracted',
      RULE_LEARNED: 'rule:learned',
      USER_JOINED: 'user:joined',
      USER_LEFT: 'user:left',
      SYSTEM_ALERT: 'system:alert',
      VALIDATION_RESULT: 'validation:result',
      UPLOAD_COMPLETED: 'upload:completed',
      EXPORT_READY: 'export:ready',
      // Document upload progress notifications
      DOCUMENT_UPLOAD_STARTED: 'document:upload:started',
      DOCUMENT_UPLOAD_PROGRESS: 'document:upload:progress',
      DOCUMENT_UPLOAD_COMPLETED: 'document:upload:completed',
      DOCUMENT_UPLOAD_FAILED: 'document:upload:failed',
      DOCUMENT_PROCESSING_STARTED: 'document:processing:started',
      DOCUMENT_PROCESSING_PROGRESS: 'document:processing:progress',
      DOCUMENT_PROCESSING_COMPLETED: 'document:processing:completed',
      DOCUMENT_PROCESSING_FAILED: 'document:processing:failed',
      DOCUMENT_CHUNK_UPLOADED: 'document:chunk:uploaded',
      DOCUMENT_CONSOLIDATED: 'document:consolidated',
      DOCUMENT_TEXT_EXTRACTED: 'document:text:extracted'
    };
    
    // Rate limiting for notifications
    this.rateLimits = new Map(); // userId -> { count, resetTime }
    this.maxNotificationsPerMinute = 60;
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    // Initialize socket.io server
    
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-production-domain.com']
          : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000', 'http://localhost:4002'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
    
    console.log('🔔 Real-time notification service initialized');
    return this.io;
  }
  
  /**
   * Authenticate socket connections using JWT
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name || 'Unknown User';
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }
  
  /**
   * Handle new socket connections
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const userName = socket.userName;
    
    console.log(`🔗 User ${userName} (${userId}) connected via WebSocket`);
    
    // Store connection
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(socket);
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(socket.id);
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);
    
    // Send queued notifications if any
    this.sendQueuedNotifications(userId, socket);
    
    // Notify others about user joining
    socket.broadcast.emit(this.NOTIFICATION_TYPES.USER_JOINED, {
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
    
    // Handle socket events
    this.setupSocketEventHandlers(socket);
    
    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
    
    // Send welcome notification
    this.sendToUser(userId, this.NOTIFICATION_TYPES.SYSTEM_ALERT, {
      message: 'Connected to real-time notifications',
      type: 'success',
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Set up socket event handlers
   */
  setupSocketEventHandlers(socket) {
    const userId = socket.userId;
    
    // Join specific rooms (for bulk operations, etc.)
    socket.on('join:room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${userId} joined room: ${roomId}`);
    });
    
    // Leave specific rooms
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${userId} left room: ${roomId}`);
    });
    
    // Request notification history
    socket.on('notifications:history', async (data) => {
      try {
        const notifications = await this.getNotificationHistory(userId, data.limit || 50);
        socket.emit('notifications:history:response', notifications);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch notification history' });
      }
    });
    
    // Mark notifications as read
    socket.on('notifications:markRead', async (notificationIds) => {
      try {
        await this.markNotificationsAsRead(userId, notificationIds);
        socket.emit('notifications:readConfirm', { notificationIds });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark notifications as read' });
      }
    });
    
    // Subscribe to specific notification types
    socket.on('subscribe', (notificationTypes) => {
      socket.notificationSubscriptions = new Set(notificationTypes);
      console.log(`User ${userId} subscribed to:`, notificationTypes);
    });
    
    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }
  
  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    const userName = socket.userName;
    
    console.log(`🔌 User ${userName} (${userId}) disconnected`);
    
    // Remove from connections
    if (this.connections.has(userId)) {
      this.connections.get(userId).delete(socket);
      if (this.connections.get(userId).size === 0) {
        this.connections.delete(userId);
      }
    }
    
    if (this.userSessions.has(userId)) {
      this.userSessions.get(userId).delete(socket.id);
      if (this.userSessions.get(userId).size === 0) {
        this.userSessions.delete(userId);
      }
    }
    
    // Notify others about user leaving (only if fully disconnected)
    if (!this.connections.has(userId)) {
      socket.broadcast.emit(this.NOTIFICATION_TYPES.USER_LEFT, {
        userId,
        userName,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Send notification to specific user
   */
  sendToUser(userId, type, data, options = {}) {
    if (!this.checkRateLimit(userId)) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }
    
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      userId,
      read: false,
      ...options
    };
    
    // Send to connected sockets
    if (this.connections.has(userId)) {
      const userSockets = this.connections.get(userId);
      for (const socket of userSockets) {
        if (!socket.notificationSubscriptions || socket.notificationSubscriptions.has(type)) {
          socket.emit('notification', notification);
        }
      }
      
      // Store in database for history
      this.storeNotification(notification);
      
      return true;
    } else {
      // Queue for offline user
      this.queueNotification(userId, notification);
      return false;
    }
  }
  
  /**
   * Send notification to multiple users
   */
  sendToUsers(userIds, type, data, options = {}) {
    const results = {};
    for (const userId of userIds) {
      results[userId] = this.sendToUser(userId, type, data, options);
    }
    return results;
  }
  
  /**
   * Send notification to all users with specific role
   */
  sendToRole(role, type, data, options = {}) {
    if (this.io) {
      const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        role,
        ...options
      };
      
      this.io.to(`role:${role}`).emit('notification', notification);
      
      // Store for all users with this role
      this.storeRoleNotification(role, notification);
      
      return true;
    }
    return false;
  }
  
  /**
   * Send notification to specific room
   */
  sendToRoom(roomId, type, data, options = {}) {
    if (this.io) {
      const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        roomId,
        ...options
      };
      
      this.io.to(roomId).emit('notification', notification);
      return true;
    }
    return false;
  }
  
  /**
   * Broadcast notification to all connected users
   */
  broadcast(type, data, options = {}) {
    if (this.io) {
      const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        broadcast: true,
        ...options
      };
      
      this.io.emit('notification', notification);
      
      // Store as system notification
      this.storeSystemNotification(notification);
      
      return true;
    }
    return false;
  }
  
  /**
   * Queue notification for offline user
   */
  queueNotification(userId, notification) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }
    
    const queue = this.notificationQueue.get(userId);
    queue.push(notification);
    
    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest notification
    }
    
    // Store in database
    this.storeNotification(notification);
  }
  
  /**
   * Send queued notifications to user
   */
  sendQueuedNotifications(userId, socket) {
    if (this.notificationQueue.has(userId)) {
      const queue = this.notificationQueue.get(userId);
      
      for (const notification of queue) {
        socket.emit('notification', notification);
      }
      
      // Clear queue
      this.notificationQueue.delete(userId);
      
      if (queue.length > 0) {
        console.log(`📬 Sent ${queue.length} queued notifications to user ${userId}`);
      }
    }
  }
  
  /**
   * Check rate limiting for user notifications
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const resetInterval = 60000; // 1 minute
    
    if (!this.rateLimits.has(userId)) {
      this.rateLimits.set(userId, { count: 1, resetTime: now + resetInterval });
      return true;
    }
    
    const userLimit = this.rateLimits.get(userId);
    
    if (now > userLimit.resetTime) {
      // Reset counter
      userLimit.count = 1;
      userLimit.resetTime = now + resetInterval;
      return true;
    }
    
    if (userLimit.count < this.maxNotificationsPerMinute) {
      userLimit.count++;
      return true;
    }
    
    return false; // Rate limit exceeded
  }
  
  /**
   * Store notification in database
   */
  async storeNotification(notification) {
    try {
      // This would integrate with your Prisma client
      // For now, we'll just log it
      console.log('📝 Storing notification:', {
        id: notification.id,
        type: notification.type,
        userId: notification.userId
      });
      
      // TODO: Implement with Prisma
      // await prisma.notification.create({
      //   data: {
      //     id: notification.id,
      //     type: notification.type,
      //     data: notification.data,
      //     userId: notification.userId,
      //     read: false,
      //     createdAt: new Date(notification.timestamp)
      //   }
      // });
      
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }
  
  /**
   * Store role-based notification
   */
  async storeRoleNotification(role, notification) {
    // Implementation would store for all users with the specified role
    console.log('📝 Storing role notification:', { role, type: notification.type });
  }
  
  /**
   * Store system-wide notification
   */
  async storeSystemNotification(notification) {
    // Implementation would store as a system notification visible to all users
    console.log('📝 Storing system notification:', { type: notification.type });
  }
  
  /**
   * Get notification history for user
   */
  async getNotificationHistory(userId, limit = 50) {
    // TODO: Implement with Prisma
    // For now, return mock data
    return [
      {
        id: 'notif-1',
        type: this.NOTIFICATION_TYPES.SYSTEM_ALERT,
        data: { message: 'Welcome to the contract management system' },
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
  }
  
  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(userId, notificationIds) {
    // TODO: Implement with Prisma
    console.log(`Marking notifications as read for user ${userId}:`, notificationIds);
  }
  
  /**
   * Set up event listeners for other services
   */
  setupEventListeners() {
    // Listen for bulk operation events
    this.on('bulk:operation:started', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.BULK_OPERATION_STARTED, {
        operationType: data.operationType,
        jobId: data.jobId,
        itemCount: data.itemCount
      });
    });
    
    this.on('bulk:operation:progress', (data) => {
      this.sendToRoom(`bulk:${data.jobId}`, this.NOTIFICATION_TYPES.BULK_OPERATION_PROGRESS, {
        jobId: data.jobId,
        progress: data.progress,
        processed: data.processed,
        total: data.total
      });
    });
    
    this.on('bulk:operation:completed', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED, {
        operationType: data.operationType,
        jobId: data.jobId,
        successfulItems: data.successfulItems,
        failedItems: data.failedItems,
        duration: data.duration
      });
    });
    
    // Listen for contract events
    this.on('contract:created', (data) => {
      this.sendToRole('admin', this.NOTIFICATION_TYPES.CONTRACT_CREATED, {
        contractId: data.contractId,
        contractName: data.contractName,
        createdBy: data.createdBy
      });
    });
    
    this.on('contract:updated', (data) => {
      this.sendToUsers(data.stakeholders, this.NOTIFICATION_TYPES.CONTRACT_UPDATED, {
        contractId: data.contractId,
        contractName: data.contractName,
        updatedBy: data.updatedBy,
        changes: data.changes
      });
    });
    
    // Listen for rule learning events
    this.on('rule:learned', (data) => {
      this.sendToRole('admin', this.NOTIFICATION_TYPES.RULE_LEARNED, {
        ruleId: data.ruleId,
        ruleName: data.ruleName,
        confidence: data.confidence,
        sourceContract: data.sourceContract
      });
    });

    // Listen for document upload events
    this.on('document:upload:started', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_UPLOAD_STARTED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        contractId: data.contractId,
        fileSize: data.fileSize,
        totalChunks: data.totalChunks
      });
    });

    this.on('document:chunk:uploaded', (data) => {
      this.sendToRoom(`document:${data.documentId}`, this.NOTIFICATION_TYPES.DOCUMENT_CHUNK_UPLOADED, {
        documentId: data.documentId,
        chunkNumber: data.chunkNumber,
        chunksUploaded: data.chunksUploaded,
        totalChunks: data.totalChunks,
        progress: Math.round((data.chunksUploaded / data.totalChunks) * 100)
      });
    });

    this.on('document:upload:progress', (data) => {
      this.sendToRoom(`document:${data.documentId}`, this.NOTIFICATION_TYPES.DOCUMENT_UPLOAD_PROGRESS, {
        documentId: data.documentId,
        progress: data.progress,
        bytesUploaded: data.bytesUploaded,
        totalBytes: data.totalBytes,
        estimatedTimeRemaining: data.estimatedTimeRemaining
      });
    });

    this.on('document:consolidated', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_CONSOLIDATED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        filePath: data.filePath
      });
    });

    this.on('document:processing:started', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_PROCESSING_STARTED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        processingType: data.processingType,
        estimatedDuration: data.estimatedDuration
      });
    });

    this.on('document:processing:progress', (data) => {
      this.sendToRoom(`document:${data.documentId}`, this.NOTIFICATION_TYPES.DOCUMENT_PROCESSING_PROGRESS, {
        documentId: data.documentId,
        progress: data.progress,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        currentStep: data.currentStep,
        estimatedTimeRemaining: data.estimatedTimeRemaining
      });
    });

    this.on('document:text:extracted', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_TEXT_EXTRACTED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        pageCount: data.pageCount,
        wordCount: data.wordCount,
        extractionMethod: data.extractionMethod,
        averageConfidence: data.averageConfidence
      });
    });

    this.on('document:upload:completed', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_UPLOAD_COMPLETED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        contractId: data.contractId,
        fileSize: data.fileSize,
        processingTime: data.processingTime
      });
    });

    this.on('document:upload:failed', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_UPLOAD_FAILED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        error: data.error,
        retryable: data.retryable
      });
    });

    this.on('document:processing:failed', (data) => {
      this.sendToUser(data.userId, this.NOTIFICATION_TYPES.DOCUMENT_PROCESSING_FAILED, {
        documentId: data.documentId,
        documentTitle: data.documentTitle,
        processingType: data.processingType,
        error: data.error,
        retryable: data.retryable
      });
    });
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.connections.size,
      totalSessions: Array.from(this.userSessions.values()).reduce((sum, sessions) => sum + sessions.size, 0),
      queuedNotifications: Array.from(this.notificationQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      rateLimitedUsers: this.rateLimits.size
    };
  }
  
  /**
   * Clean up old rate limit data
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(userId);
      }
    }
  }
  
  /**
   * Shutdown the service gracefully
   */
  shutdown() {
    console.log('🔔 Shutting down notification service...');
    
    // Notify all connected users
    this.broadcast(this.NOTIFICATION_TYPES.SYSTEM_ALERT, {
      message: 'Server is shutting down. Please reconnect in a moment.',
      type: 'warning'
    });
    
    // Close all connections
    if (this.io) {
      this.io.close();
    }
    
    // Clear data structures
    this.connections.clear();
    this.userSessions.clear();
    this.notificationQueue.clear();
    this.rateLimits.clear();
    
    console.log('🔔 Notification service shut down complete');
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();

export default notificationService;
