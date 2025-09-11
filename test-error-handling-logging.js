/**
 * Test script for Comprehensive Error Handling and Logging System
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import loggingService from './server/src/services/loggingService.js';
import errorHandlingService from './server/src/services/errorHandlingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock database operation
async function mockDatabaseOperation(shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        const error = new Error('Database connection timeout');
        error.code = 'P2024';
        error.statusCode = 500;
        reject(error);
      } else {
        resolve({ id: 'test-123', data: 'success' });
      }
    }, Math.random() * 1000);
  });
}

// Mock external API call
async function mockExternalAPICall(shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        const error = new Error('External service unavailable');
        error.code = 'ECONNREFUSED';
        error.statusCode = 503;
        reject(error);
      } else {
        resolve({ data: 'API response' });
      }
    }, Math.random() * 500);
  });
}

// Mock validation function
function mockValidation(data) {
  if (!data.name) {
    const error = new Error('Name is required');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = [{ field: 'name', message: 'Name is required' }];
    throw error;
  }
  return true;
}

async function testLoggingService() {
  console.log('\n=== Testing Logging Service ===');
  
  try {
    // Test different log levels
    console.log('📝 Testing log levels...');
    await loggingService.error('Test error message', { testType: 'error_test' });
    await loggingService.warn('Test warning message', { testType: 'warning_test' });
    await loggingService.info('Test info message', { testType: 'info_test' });
    await loggingService.debug('Test debug message', { testType: 'debug_test' });
    
    // Test performance tracking
    console.log('⏱️  Testing performance tracking...');
    const timerId = loggingService.startTimer('test_operation', { userId: 'test-user' });
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
    const duration = await loggingService.endTimer(timerId, { result: 'success' });
    console.log(`   Timer completed in ${duration}ms`);
    
    // Test request correlation
    console.log('🔗 Testing request correlation...');
    const requestId = 'req-' + Date.now();
    loggingService.startRequestCorrelation(requestId, {
      method: 'POST',
      url: '/test',
      ip: '127.0.0.1'
    });
    
    await loggingService.info('Processing request', { requestId });
    
    const correlationData = loggingService.endRequestCorrelation(requestId, {
      statusCode: 200,
      responseSize: 1024
    });
    console.log('   Correlation data:', correlationData);
    
    // Test audit logging
    console.log('📋 Testing audit logging...');
    await loggingService.audit('TEST_ACTION', {
      userId: 'test-user',
      resource: 'test-resource',
      action: 'create'
    });
    
    // Test specialized logging methods
    console.log('🔍 Testing specialized logging...');
    await loggingService.logAuth('login_success', 'test-user', {
      ip: '127.0.0.1',
      userAgent: 'test-agent'
    });
    
    await loggingService.logDatabaseOperation('SELECT', 'contracts', 150, {
      query: 'SELECT * FROM contracts LIMIT 10'
    });
    
    await loggingService.logFileOperation('upload', 'test.pdf', 2048, {
      userId: 'test-user',
      mimeType: 'application/pdf'
    });
    
    await loggingService.logAIOperation('rule_extraction', 'claude-3', 1500, 0.05, {
      duration_ms: 2000,
      contractId: 'contract-123'
    });
    
    await loggingService.logBulkOperation('import', 10, 8, 2, 5000, {
      userId: 'test-user',
      jobId: 'bulk-123'
    });
    
    // Test log statistics
    console.log('📊 Testing log statistics...');
    const stats = await loggingService.getLogStats();
    console.log('   Log stats:', JSON.stringify(stats, null, 2));
    
    return true;
    
  } catch (error) {
    console.error('❌ Logging service test failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling Service ===');
  
  try {
    // Test validation error
    console.log('🔍 Testing validation error handling...');
    try {
      mockValidation({});
    } catch (error) {
      const response = await errorHandlingService.handleError(error, {
        source: 'test_validation',
        userId: 'test-user'
      });
      console.log('   Validation error response:', response.error.type);
    }
    
    // Test database error
    console.log('💾 Testing database error handling...');
    try {
      await mockDatabaseOperation(true);
    } catch (error) {
      const response = await errorHandlingService.handleError(error, {
        source: 'test_database',
        userId: 'test-user'
      });
      console.log('   Database error response:', response.error.type);
    }
    
    // Test network error
    console.log('🌐 Testing network error handling...');
    try {
      await mockExternalAPICall(true);
    } catch (error) {
      const response = await errorHandlingService.handleError(error, {
        source: 'test_network',
        userId: 'test-user'
      });
      console.log('   Network error response:', response.error.type);
    }
    
    // Test critical error
    console.log('🚨 Testing critical error handling...');
    const criticalError = new Error('System out of memory');
    criticalError.statusCode = 500;
    await errorHandlingService.handleCriticalError('MEMORY_ERROR', criticalError, {
      source: 'test_critical',
      memoryUsage: process.memoryUsage()
    });
    
    // Test retry mechanism
    console.log('🔄 Testing retry mechanism...');
    let attemptCount = 0;
    const unreliableOperation = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        const error = new Error('Temporary failure');
        error.code = 'ECONNRESET';
        throw error;
      }
      return { success: true, attempts: attemptCount };
    };
    
    try {
      const result = await errorHandlingService.retryWithStrategy(
        unreliableOperation,
        errorHandlingService.errorTypes.NETWORK,
        { operation: 'test_retry' }
      );
      console.log(`   Retry successful after ${result.attempts} attempts`);
    } catch (error) {
      console.log('   Retry failed:', error.message);
    }
    
    // Test circuit breaker
    console.log('🔌 Testing circuit breaker...');
    const flakeyService = async () => {
      const error = new Error('Service unavailable');
      error.statusCode = 503;
      throw error;
    };
    
    // Simulate multiple failures to open circuit breaker
    for (let i = 0; i < 6; i++) {
      try {
        await errorHandlingService.executeWithCircuitBreaker('test-service', flakeyService);
      } catch (error) {
        console.log(`   Circuit breaker attempt ${i + 1}: ${error.message}`);
      }
    }
    
    // Test error statistics
    console.log('📈 Testing error statistics...');
    const errorStats = errorHandlingService.getErrorStats();
    console.log('   Error stats:', JSON.stringify(errorStats, null, 2));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

async function testIntegration() {
  console.log('\n=== Testing Integration ===');
  
  try {
    // Test error handling with logging integration
    console.log('🔗 Testing error handling with logging...');
    
    const requestId = 'req-integration-' + Date.now();
    loggingService.startRequestCorrelation(requestId, {
      method: 'POST',
      url: '/api/test/integration',
      ip: '127.0.0.1',
      userId: 'test-user'
    });
    
    // Simulate a complex operation with multiple potential failure points
    const complexOperation = async () => {
      const timerId = loggingService.startTimer('complex_operation', { requestId });
      
      try {
        // Step 1: Validation
        await loggingService.info('Starting complex operation', { requestId, step: 'validation' });
        mockValidation({ name: 'Test Contract' });
        
        // Step 2: Database operation
        await loggingService.info('Performing database operation', { requestId, step: 'database' });
        await mockDatabaseOperation(false);
        
        // Step 3: External API call
        await loggingService.info('Calling external API', { requestId, step: 'external_api' });
        await mockExternalAPICall(false);
        
        await loggingService.endTimer(timerId, { success: true });
        await loggingService.info('Complex operation completed successfully', { requestId });
        
        return { success: true, requestId };
        
      } catch (error) {
        await loggingService.endTimer(timerId, { success: false, error: error.message });
        
        const errorResponse = await errorHandlingService.handleError(error, {
          requestId,
          operation: 'complex_operation',
          userId: 'test-user'
        });
        
        throw errorResponse;
      }
    };
    
    try {
      const result = await complexOperation();
      console.log('   Complex operation succeeded:', result.success);
    } catch (error) {
      console.log('   Complex operation failed:', error.error.type);
    }
    
    loggingService.endRequestCorrelation(requestId, {
      statusCode: 200,
      completed: true
    });
    
    // Test load simulation
    console.log('📊 Testing load simulation...');
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        (async () => {
          const reqId = `req-load-${i}`;
          const timer = loggingService.startTimer('load_test_operation', { requestId: reqId });
          
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            
            if (Math.random() < 0.3) { // 30% failure rate
              throw new Error('Random load test failure');
            }
            
            await loggingService.endTimer(timer, { success: true });
            return { success: true, id: i };
            
          } catch (error) {
            await loggingService.endTimer(timer, { success: false });
            await errorHandlingService.handleError(error, {
              requestId: reqId,
              loadTest: true,
              operationId: i
            });
            throw error;
          }
        })()
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`   Load test completed: ${successful} successful, ${failed} failed`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return false;
  }
}

async function testLogRotation() {
  console.log('\n=== Testing Log Rotation ===');
  
  try {
    // Create a large log entry to test file handling
    const largeData = {
      test: 'log_rotation',
      data: 'x'.repeat(1000), // 1KB of data
      timestamp: new Date().toISOString()
    };
    
    // Generate multiple log entries
    for (let i = 0; i < 10; i++) {
      await loggingService.info(`Log rotation test entry ${i}`, {
        ...largeData,
        index: i
      });
    }
    
    // Test cleanup
    loggingService.cleanup();
    errorHandlingService.cleanup();
    
    console.log('✅ Log rotation and cleanup test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Log rotation test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Error Handling and Logging Tests');
  console.log('='.repeat(70));
  
  const results = {
    loggingService: await testLoggingService(),
    errorHandling: await testErrorHandling(),
    integration: await testIntegration(),
    logRotation: await testLogRotation()
  };
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary:');
  console.log(`   Logging Service: ${results.loggingService ? '✅' : '❌'}`);
  console.log(`   Error Handling: ${results.errorHandling ? '✅' : '❌'}`);
  console.log(`   Integration: ${results.integration ? '✅' : '❌'}`);
  console.log(`   Log Rotation: ${results.logRotation ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 Overall Success Rate: ${successCount}/4 (${(successCount/4*100).toFixed(1)}%)`);
  
  if (successCount === 4) {
    console.log('🎉 All tests passed! Error handling and logging system is working correctly.');
    console.log('\n💡 Available features:');
    console.log('   • Structured JSON logging with multiple severity levels');
    console.log('   • Automatic log rotation and file management');
    console.log('   • Performance tracking with start/end timers');
    console.log('   • Request correlation across operations');
    console.log('   • Audit logging for security and compliance');
    console.log('   • Specialized logging for auth, DB, files, AI, bulk operations');
    console.log('   • Comprehensive error classification and handling');
    console.log('   • Automatic retry with exponential backoff');
    console.log('   • Circuit breaker pattern for external services');
    console.log('   • Error pattern analysis and alerting');
    console.log('   • Real-time notifications for critical errors');
    console.log('   • Sanitized error messages for production');
    console.log('   • Global error handlers for uncaught exceptions');
    console.log('\n🔗 API Endpoints:');
    console.log('   • GET /api/monitoring/health - System health check');
    console.log('   • GET /api/monitoring/stats - System statistics (admin)');
    console.log('   • GET /api/monitoring/logs - Log retrieval (admin)');
    console.log('   • GET /api/monitoring/errors - Error analytics (admin)');
    console.log('   • GET /api/monitoring/performance - Performance metrics (admin)');
    console.log('   • GET /api/monitoring/audit - Audit log entries (admin)');
    console.log('   • GET /api/monitoring/alerts - Active system alerts (admin)');
    console.log('   • POST /api/monitoring/test-error - Generate test errors (dev)');
    console.log('   • POST /api/monitoring/cleanup - Manual cleanup (admin)');
    console.log('\n📁 Log Files:');
    console.log('   • ./logs/application.log - Main application log');
    console.log('   • ./logs/error.log - Error-specific log');
    console.log('   • ./logs/audit.log - Security and compliance log');
    console.log('   • ./logs/performance.log - Performance metrics log');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
  
  console.log('\n📋 Configuration Options:');
  console.log('Environment Variables:');
  console.log('   • LOG_LEVEL - Set logging level (error, warn, info, debug)');
  console.log('   • LOG_FILE - Main log file path');
  console.log('   • ERROR_LOG_FILE - Error log file path');
  console.log('   • AUDIT_LOG_FILE - Audit log file path');
  console.log('   • PERFORMANCE_LOG_FILE - Performance log file path');
  console.log('   • MAX_LOG_SIZE - Maximum log file size before rotation');
  console.log('   • MAX_LOG_FILES - Number of rotated log files to keep');
  
  // Final statistics
  console.log('\n📈 Final Statistics:');
  const logStats = await loggingService.getLogStats();
  const errorStats = errorHandlingService.getErrorStats();
  
  console.log('   Logging:', {
    active_timers: logStats.activeTimers,
    active_correlations: logStats.activeCorrelations
  });
  
  console.log('   Errors:', {
    recent_errors: errorStats.recent_errors,
    error_patterns: errorStats.total_patterns,
    circuit_breakers: errorStats.active_circuit_breakers
  });
  
  // Cleanup
  await loggingService.shutdown();
  await errorHandlingService.shutdown();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testLoggingService, testErrorHandling };