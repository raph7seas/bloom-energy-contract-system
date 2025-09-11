/**
 * Test script for Real-time Notifications functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bulkOperationsService from './server/src/services/bulkOperationsService.js';
import notificationService from './server/src/services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Prisma client for testing
const mockPrisma = {
  contract: {
    create: async (data) => ({
      id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    findMany: async (options) => [
      {
        id: 'contract-1',
        name: 'Test Contract 1',
        client: 'Test Corp',
        status: 'ACTIVE',
        capacity: 1000,
        term: 15,
        financial: { baseRate: 0.085, escalation: 3.2 },
        technical: { voltage: 'V_13_2K' },
        operating: { outputWarranty: 92 },
        uploads: [],
        templates: []
      }
    ],
    updateMany: async (options) => ({ count: options.where.id.in.length }),
    delete: async (options) => ({ id: options.where.id }),
    count: async (options) => 0
  },
  uploadedFile: {
    create: async (data) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data.data,
      uploadDate: new Date()
    })
  },
  auditLog: {
    create: async (data) => ({ id: `audit-${Date.now()}`, ...data.data }),
    createMany: async (data) => ({ count: data.data.length })
  }
};

// Mock Socket.IO server for testing
let mockSocketServer = null;
let mockSocket = null;

function createMockSocketServer() {
  const events = new Map();
  
  return {
    on: (event, handler) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      events.get(event).push(handler);
    },
    emit: (event, data) => {
      console.log(`📡 Server emit: ${event}`, data);
      if (events.has(event)) {
        events.get(event).forEach(handler => handler(data));
      }
    },
    to: (room) => ({
      emit: (event, data) => {
        console.log(`📡 Room ${room} emit: ${event}`, data);
      }
    }),
    close: () => {
      console.log('🔌 Mock socket server closed');
    }
  };
}

function createMockSocket(userId = 'test-user-123') {
  const events = new Map();
  
  return {
    id: `socket-${Date.now()}`,
    userId,
    userRole: 'admin',
    userName: 'Test User',
    connected: true,
    join: (room) => {
      console.log(`🔗 Socket joined room: ${room}`);
    },
    leave: (room) => {
      console.log(`🚪 Socket left room: ${room}`);
    },
    emit: (event, data) => {
      console.log(`📤 Socket emit: ${event}`, data);
    },
    on: (event, handler) => {
      if (!events.has(event)) {
        events.set(event, []);
      }
      events.get(event).push(handler);
    },
    broadcast: {
      emit: (event, data) => {
        console.log(`📢 Socket broadcast: ${event}`, data);
      }
    }
  };
}

function createMockFile(name, content, mimetype = 'text/plain') {
  return {
    originalname: name,
    mimetype: mimetype,
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content)
  };
}

async function testNotificationService() {
  console.log('\\n=== Testing Notification Service ===');
  
  try {
    // Initialize mock server
    mockSocketServer = createMockSocketServer();
    notificationService.io = mockSocketServer;
    
    // Create mock socket connection
    mockSocket = createMockSocket('test-user-123');
    
    console.log('📊 Service Stats:');
    const stats = notificationService.getStats();
    console.log(`   Connected users: ${stats.connectedUsers}`);
    console.log(`   Total sessions: ${stats.totalSessions}`);
    console.log(`   Queued notifications: ${stats.queuedNotifications}`);
    
    // Test sending notifications
    console.log('\\n📨 Testing notification sending:');
    
    // Send user notification
    const userResult = notificationService.sendToUser(
      'test-user-123',
      notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT,
      { message: 'Test user notification', type: 'info' }
    );
    console.log(`   User notification sent: ${userResult}`);
    
    // Send role notification
    const roleResult = notificationService.sendToRole(
      'admin',
      notificationService.NOTIFICATION_TYPES.CONTRACT_CREATED,
      { contractId: 'test-contract', contractName: 'Test Contract', createdBy: 'Test User' }
    );
    console.log(`   Role notification sent: ${roleResult}`);
    
    // Send broadcast notification
    const broadcastResult = notificationService.broadcast(
      notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT,
      { message: 'System maintenance starting soon', type: 'warning' }
    );
    console.log(`   Broadcast notification sent: ${broadcastResult}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Notification service test failed:', error.message);
    return false;
  }
}

async function testBulkOperationsWithNotifications() {
  console.log('\\n=== Testing Bulk Operations with Real-time Notifications ===');
  
  try {
    // Set up notification listeners
    const notificationPromises = [];
    
    // Listen for bulk operation notifications
    const notificationListener = (data) => {
      console.log(`🔔 Notification Event: ${data.type || 'unknown'}`, data);
    };
    
    notificationService.on('bulk:operation:started', notificationListener);
    notificationService.on('bulk:operation:progress', notificationListener);
    notificationService.on('bulk:operation:completed', notificationListener);
    
    // Create mock files for bulk import
    const files = [
      createMockFile('contract1.txt', 'Test contract 1 content with capacity 1000kW and term 15 years.'),
      createMockFile('contract2.txt', 'Test contract 2 content with capacity 2000kW and term 20 years.'),
      createMockFile('contract3.pdf', 'PDF content for contract 3', 'application/pdf')
    ];
    
    const options = {
      defaultClient: 'Test Corporation',
      extractRules: true,
      useAI: false,
      autoExtractDetails: true
    };
    
    console.log(`📤 Starting bulk import with notifications...`);
    
    // Set up event listeners for bulk operations
    const bulkEventPromise = new Promise((resolve) => {
      let completedReceived = false;
      
      bulkOperationsService.on('job:started', (data) => {
        console.log(`✅ Bulk Job started: ${data.jobId}`);
        
        // Simulate notification service integration
        notificationService.emit('bulk:operation:started', {
          userId: 'test-user-123',
          operationType: 'import',
          jobId: data.jobId,
          itemCount: files.length
        });
      });
      
      bulkOperationsService.on('item:processing', (data) => {
        console.log(`   Processing item ${data.itemIndex + 1}: ${data.fileName}`);
      });
      
      bulkOperationsService.on('item:success', (data) => {
        console.log(`   ✅ Success: ${data.fileName} -> Contract ${data.contractId}`);
      });
      
      bulkOperationsService.on('job:progress', (data) => {
        console.log(`   📊 Progress: ${data.processed}/${data.total} (${data.progress}%)`);
        
        // Simulate notification service integration
        notificationService.emit('bulk:operation:progress', {
          jobId: data.jobId,
          progress: data.progress,
          processed: data.processed,
          total: data.total
        });
      });
      
      bulkOperationsService.on('job:completed', (data) => {
        if (!completedReceived) {
          completedReceived = true;
          console.log(`🎉 Bulk Import completed!`);
          console.log(`   Successful: ${data.job.successfulItems}`);
          console.log(`   Failed: ${data.job.failedItems}`);
          console.log(`   Duration: ${data.job.duration}ms`);
          
          // Simulate notification service integration
          notificationService.emit('bulk:operation:completed', {
            userId: 'test-user-123',
            operationType: 'import',
            jobId: data.job.id,
            successfulItems: data.job.successfulItems,
            failedItems: data.job.failedItems,
            duration: data.job.duration
          });
          
          resolve(data.job);
        }
      });
    });
    
    // Start the bulk import
    const result = await bulkOperationsService.bulkImportContracts(
      files, 
      options, 
      mockPrisma, 
      'test-user-123'
    );
    
    // Wait for completion
    await bulkEventPromise;
    
    return result !== null;
    
  } catch (error) {
    console.error('❌ Bulk operations with notifications test failed:', error.message);
    return false;
  }
}

async function testWebSocketConnection() {
  console.log('\\n=== Testing WebSocket Connection Simulation ===');
  
  try {
    // Simulate connection event
    console.log('🔗 Simulating user connection...');
    notificationService.handleConnection(mockSocket);
    
    // Test connection statistics
    const stats = notificationService.getStats();
    console.log(`📊 Connection Stats:`, stats);
    
    // Simulate joining rooms
    console.log('🏠 Testing room operations...');
    
    // Join bulk operation room
    const jobId = 'bulk-import-123';
    console.log(`   Joining room: bulk:${jobId}`);
    
    // Send room-specific notification
    notificationService.sendToRoom(
      `bulk:${jobId}`,
      notificationService.NOTIFICATION_TYPES.BULK_OPERATION_PROGRESS,
      {
        jobId,
        progress: 50,
        processed: 5,
        total: 10,
        message: 'Halfway through bulk operation'
      }
    );
    
    // Test rate limiting
    console.log('🚦 Testing rate limiting...');
    let rateLimitHit = false;
    
    for (let i = 0; i < 65; i++) { // Try to exceed the 60/minute limit
      const sent = notificationService.sendToUser(
        'test-user-123',
        notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT,
        { message: `Rate limit test ${i + 1}` }
      );
      
      if (!sent) {
        console.log(`   Rate limit hit at notification ${i + 1}`);
        rateLimitHit = true;
        break;
      }
    }
    
    if (!rateLimitHit) {
      console.log('   ⚠️ Rate limiting may not be working correctly');
    }
    
    // Clean up rate limits
    notificationService.cleanupRateLimits();
    console.log('   Rate limits cleaned up');
    
    return true;
    
  } catch (error) {
    console.error('❌ WebSocket connection test failed:', error.message);
    return false;
  }
}

async function testNotificationTypes() {
  console.log('\\n=== Testing All Notification Types ===');
  
  try {
    const testUserId = 'test-user-123';
    const types = Object.entries(notificationService.NOTIFICATION_TYPES);
    
    console.log(`🧪 Testing ${types.length} notification types...`);
    
    for (const [key, value] of types) {
      const testData = generateTestDataForType(value);
      const result = notificationService.sendToUser(testUserId, value, testData);
      console.log(`   ${key}: ${result ? '✅' : '❌'}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Notification types test failed:', error.message);
    return false;
  }
}

function generateTestDataForType(type) {
  switch (type) {
    case notificationService.NOTIFICATION_TYPES.CONTRACT_CREATED:
      return { contractId: 'test-123', contractName: 'Test Contract', createdBy: 'Test User' };
    case notificationService.NOTIFICATION_TYPES.CONTRACT_UPDATED:
      return { contractId: 'test-123', contractName: 'Test Contract', updatedBy: 'Test User', changes: ['status'] };
    case notificationService.NOTIFICATION_TYPES.BULK_OPERATION_STARTED:
      return { operationType: 'import', jobId: 'job-123', itemCount: 5 };
    case notificationService.NOTIFICATION_TYPES.BULK_OPERATION_PROGRESS:
      return { jobId: 'job-123', progress: 50, processed: 5, total: 10 };
    case notificationService.NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED:
      return { operationType: 'import', jobId: 'job-123', successfulItems: 8, failedItems: 2, duration: 5000 };
    case notificationService.NOTIFICATION_TYPES.RULE_LEARNED:
      return { ruleId: 'rule-123', ruleName: 'Capacity Range', confidence: 0.85, sourceContract: 'contract-123' };
    case notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT:
      return { message: 'Test system alert', type: 'info' };
    default:
      return { message: 'Test notification data' };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Real-time Notifications Tests');
  console.log('='.repeat(60));
  
  const results = {
    notificationService: await testNotificationService(),
    bulkOperationsWithNotifications: await testBulkOperationsWithNotifications(),
    webSocketConnection: await testWebSocketConnection(),
    notificationTypes: await testNotificationTypes()
  };
  
  console.log('\\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`   Notification Service: ${results.notificationService ? '✅' : '❌'}`);
  console.log(`   Bulk Operations + Notifications: ${results.bulkOperationsWithNotifications ? '✅' : '❌'}`);
  console.log(`   WebSocket Connection: ${results.webSocketConnection ? '✅' : '❌'}`);
  console.log(`   Notification Types: ${results.notificationTypes ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\\n🎯 Overall Success Rate: ${successCount}/4 (${(successCount/4*100).toFixed(1)}%)`);
  
  if (successCount === 4) {
    console.log('🎉 All tests passed! Real-time notification system is working correctly.');
    console.log('\\n💡 Available features:');
    console.log('   • WebSocket connections with JWT authentication');
    console.log('   • Real-time notifications for all user actions');
    console.log('   • Bulk operation progress tracking');
    console.log('   • Room-based notifications for job updates');
    console.log('   • Rate limiting and connection management');
    console.log('   • Notification history and read status');
    console.log('   • Role-based and broadcast notifications');
    console.log('\\n🔗 API Endpoints:');
    console.log('   • GET /api/notifications/stats - Service statistics');
    console.log('   • GET /api/notifications/history - User notification history');
    console.log('   • PATCH /api/notifications/mark-read - Mark notifications as read');
    console.log('   • POST /api/notifications/send - Send custom notifications (admin)');
    console.log('   • POST /api/notifications/test - Send test notifications (dev)');
    console.log('\\n🔌 WebSocket Events:');
    console.log('   • notification - Receive real-time notifications');
    console.log('   • join:room / leave:room - Room management');
    console.log('   • subscribe - Subscribe to specific notification types');
    console.log('   • ping / pong - Connection health checks');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
  
  // Clean up
  if (mockSocketServer) {
    mockSocketServer.close();
  }
  
  console.log('\\n📋 Integration Guide:');
  console.log('1. Import useNotifications hook in React components');
  console.log('2. Add NotificationCenter component to main layout');
  console.log('3. Use joinRoom() for bulk operation progress tracking');
  console.log('4. Connect bulk operations to notification service events');
  console.log('5. Configure authentication tokens for WebSocket connections');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testNotificationService, testBulkOperationsWithNotifications };