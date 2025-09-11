/**
 * Comprehensive Error Handling Service
 * Centralized error management with classification, recovery, and reporting
 */

import loggingService from './loggingService.js';
import notificationService from './notificationService.js';

class ErrorHandlingService {
  constructor() {
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.recoverableErrors = new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ]);
    
    // Error classification
    this.errorTypes = {
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      NOT_FOUND: 'not_found',
      CONFLICT: 'conflict',
      RATE_LIMIT: 'rate_limit',
      SERVER_ERROR: 'server_error',
      DATABASE: 'database',
      EXTERNAL_API: 'external_api',
      FILE_SYSTEM: 'file_system',
      NETWORK: 'network',
      CONFIGURATION: 'configuration',
      BUSINESS_LOGIC: 'business_logic'
    };
    
    // Error severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
    
    // Error reporting thresholds
    this.alertThresholds = {
      error_rate_per_minute: 10,
      critical_errors_per_hour: 5,
      consecutive_failures: 3
    };
    
    // Circuit breaker pattern
    this.circuitBreakers = new Map();
    
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('UNCAUGHT_EXCEPTION', error, {
        source: 'process.uncaughtException'
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('UNHANDLED_REJECTION', reason, {
        source: 'process.unhandledRejection',
        promise: promise.toString()
      });
    });

    // Warning events
    process.on('warning', (warning) => {
      loggingService.warn('Process warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });
  }

  /**
   * Setup recovery strategies for different error types
   */
  setupRecoveryStrategies() {
    this.recoveryStrategies.set(this.errorTypes.DATABASE, {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      strategy: 'retry_with_backoff'
    });

    this.recoveryStrategies.set(this.errorTypes.EXTERNAL_API, {
      maxRetries: 2,
      retryDelay: 2000,
      exponentialBackoff: true,
      strategy: 'retry_with_circuit_breaker'
    });

    this.recoveryStrategies.set(this.errorTypes.NETWORK, {
      maxRetries: 3,
      retryDelay: 500,
      exponentialBackoff: true,
      strategy: 'retry_immediate'
    });

    this.recoveryStrategies.set(this.errorTypes.RATE_LIMIT, {
      maxRetries: 1,
      retryDelay: 60000, // 1 minute
      exponentialBackoff: false,
      strategy: 'retry_after_delay'
    });
  }

  /**
   * Classify error based on type and characteristics
   */
  classifyError(error, context = {}) {
    const errorData = {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode || error.status,
      stack: error.stack,
      ...context
    };

    let errorType = this.errorTypes.SERVER_ERROR;
    let severity = this.severityLevels.MEDIUM;

    // Classification logic
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      errorType = this.errorTypes.VALIDATION;
      severity = this.severityLevels.LOW;
    } else if (error.statusCode === 401) {
      errorType = this.errorTypes.AUTHENTICATION;
      severity = this.severityLevels.MEDIUM;
    } else if (error.statusCode === 403) {
      errorType = this.errorTypes.AUTHORIZATION;
      severity = this.severityLevels.MEDIUM;
    } else if (error.statusCode === 404) {
      errorType = this.errorTypes.NOT_FOUND;
      severity = this.severityLevels.LOW;
    } else if (error.statusCode === 409) {
      errorType = this.errorTypes.CONFLICT;
      severity = this.severityLevels.LOW;
    } else if (error.statusCode === 429) {
      errorType = this.errorTypes.RATE_LIMIT;
      severity = this.severityLevels.MEDIUM;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorType = this.errorTypes.NETWORK;
      severity = this.severityLevels.HIGH;
    } else if (error.message?.includes('database') || error.code?.startsWith('P')) {
      errorType = this.errorTypes.DATABASE;
      severity = this.severityLevels.HIGH;
    } else if (error.message?.includes('API') || context.source === 'external_api') {
      errorType = this.errorTypes.EXTERNAL_API;
      severity = this.severityLevels.MEDIUM;
    } else if (error.code?.startsWith('E') && error.code !== 'ENOENT') {
      errorType = this.errorTypes.FILE_SYSTEM;
      severity = this.severityLevels.MEDIUM;
    } else if (error.statusCode >= 500) {
      errorType = this.errorTypes.SERVER_ERROR;
      severity = this.severityLevels.HIGH;
    }

    // Check for critical patterns
    if (this.isCriticalError(error, errorType)) {
      severity = this.severityLevels.CRITICAL;
    }

    return {
      ...errorData,
      type: errorType,
      severity,
      timestamp: new Date().toISOString(),
      recoverable: this.isRecoverableError(error, errorType)
    };
  }

  /**
   * Check if error is critical
   */
  isCriticalError(error, errorType) {
    const criticalPatterns = [
      /out of memory/i,
      /heap out of memory/i,
      /maximum call stack/i,
      /database connection/i,
      /authentication service/i,
      /security/i
    ];

    const criticalTypes = [
      this.errorTypes.DATABASE,
      this.errorTypes.AUTHENTICATION
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message)) ||
           criticalTypes.includes(errorType) ||
           error.statusCode >= 500;
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error, errorType) {
    return this.recoverableErrors.has(error.code) ||
           this.recoveryStrategies.has(errorType) ||
           errorType === this.errorTypes.RATE_LIMIT ||
           errorType === this.errorTypes.NETWORK;
  }

  /**
   * Main error handling method
   */
  async handleError(error, context = {}) {
    const classifiedError = this.classifyError(error, context);
    
    // Track error patterns
    this.trackErrorPattern(classifiedError);
    
    // Log the error
    await this.logError(classifiedError);
    
    // Send notifications for critical errors
    if (classifiedError.severity === this.severityLevels.CRITICAL) {
      await this.sendCriticalErrorNotification(classifiedError);
    }
    
    // Check for error thresholds
    await this.checkErrorThresholds(classifiedError);
    
    // Return formatted error response
    return this.formatErrorResponse(classifiedError);
  }

  /**
   * Handle critical errors that require immediate attention
   */
  async handleCriticalError(type, error, context = {}) {
    const criticalError = {
      ...this.classifyError(error, context),
      type,
      severity: this.severityLevels.CRITICAL,
      critical: true
    };

    await loggingService.error(`CRITICAL ERROR: ${type}`, {
      error: criticalError,
      process_info: {
        pid: process.pid,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      }
    });

    // Send immediate notification
    await this.sendCriticalErrorNotification(criticalError);

    // For truly critical errors, consider graceful shutdown
    if (type === 'UNCAUGHT_EXCEPTION') {
      console.error('CRITICAL: Uncaught exception detected, initiating graceful shutdown...');
      setTimeout(() => {
        process.exit(1);
      }, 5000); // Give 5 seconds for cleanup
    }
  }

  /**
   * Track error patterns for analysis
   */
  trackErrorPattern(errorData) {
    const pattern = `${errorData.type}_${errorData.name}`;
    const now = Date.now();
    
    if (!this.errorPatterns.has(pattern)) {
      this.errorPatterns.set(pattern, {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        recent: []
      });
    }
    
    const patternData = this.errorPatterns.get(pattern);
    patternData.count++;
    patternData.lastSeen = now;
    patternData.recent.push(now);
    
    // Keep only recent errors (last hour)
    const oneHourAgo = now - 3600000;
    patternData.recent = patternData.recent.filter(time => time > oneHourAgo);
  }

  /**
   * Log error with appropriate level and context
   */
  async logError(errorData) {
    const logMeta = {
      error_type: errorData.type,
      severity: errorData.severity,
      recoverable: errorData.recoverable,
      statusCode: errorData.statusCode,
      stack: errorData.stack,
      context: errorData.context
    };

    switch (errorData.severity) {
      case this.severityLevels.CRITICAL:
        await loggingService.error(`CRITICAL: ${errorData.message}`, logMeta);
        break;
      case this.severityLevels.HIGH:
        await loggingService.error(errorData.message, logMeta);
        break;
      case this.severityLevels.MEDIUM:
        await loggingService.warn(errorData.message, logMeta);
        break;
      case this.severityLevels.LOW:
        await loggingService.info(errorData.message, logMeta);
        break;
    }
  }

  /**
   * Send critical error notifications
   */
  async sendCriticalErrorNotification(errorData) {
    try {
      // Send to admin users
      notificationService.sendToRole('admin', 
        notificationService.NOTIFICATION_TYPES.SYSTEM_ALERT, 
        {
          type: 'critical_error',
          errorType: errorData.type,
          message: errorData.message,
          severity: errorData.severity,
          timestamp: errorData.timestamp
        }
      );
    } catch (error) {
      // Don't throw if notification fails
      console.error('Failed to send critical error notification:', error);
    }
  }

  /**
   * Check error thresholds and send alerts
   */
  async checkErrorThresholds(errorData) {
    const pattern = `${errorData.type}_${errorData.name}`;
    const patternData = this.errorPatterns.get(pattern);
    
    if (!patternData) return;
    
    const now = Date.now();
    const recentErrors = patternData.recent.length;
    
    // Check error rate threshold
    if (recentErrors >= this.alertThresholds.error_rate_per_minute) {
      await loggingService.warn('High error rate detected', {
        pattern,
        error_count: recentErrors,
        threshold: this.alertThresholds.error_rate_per_minute
      });
    }
    
    // Check critical error threshold
    if (errorData.severity === this.severityLevels.CRITICAL) {
      const criticalCount = Array.from(this.errorPatterns.values())
        .filter(p => p.recent.length > 0)
        .reduce((sum, p) => sum + p.recent.length, 0);
      
      if (criticalCount >= this.alertThresholds.critical_errors_per_hour) {
        await this.sendCriticalErrorNotification({
          ...errorData,
          message: `Critical error threshold exceeded: ${criticalCount} critical errors in the last hour`
        });
      }
    }
  }

  /**
   * Format error response for API
   */
  formatErrorResponse(errorData) {
    const response = {
      success: false,
      error: {
        type: errorData.type,
        message: this.sanitizeErrorMessage(errorData.message),
        timestamp: errorData.timestamp
      }
    };

    // Add status code if available
    if (errorData.statusCode) {
      response.error.statusCode = errorData.statusCode;
    }

    // Add validation details for validation errors
    if (errorData.type === this.errorTypes.VALIDATION && errorData.details) {
      response.error.details = errorData.details;
    }

    // Add retry information for recoverable errors
    if (errorData.recoverable) {
      response.error.recoverable = true;
      const strategy = this.recoveryStrategies.get(errorData.type);
      if (strategy) {
        response.error.retryAfter = strategy.retryDelay;
      }
    }

    // Don't expose sensitive information in production
    if (process.env.NODE_ENV !== 'production') {
      response.error.stack = errorData.stack;
      response.error.details = errorData;
    }

    return response;
  }

  /**
   * Sanitize error messages to prevent information leakage
   */
  sanitizeErrorMessage(message) {
    if (process.env.NODE_ENV === 'production') {
      // Replace sensitive patterns
      return message
        .replace(/password/gi, '[REDACTED]')
        .replace(/token/gi, '[REDACTED]')
        .replace(/key/gi, '[REDACTED]')
        .replace(/secret/gi, '[REDACTED]')
        .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }
    return message;
  }

  /**
   * Retry operation with recovery strategy
   */
  async retryWithStrategy(operation, errorType, context = {}) {
    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      throw new Error(`No recovery strategy for error type: ${errorType}`);
    }

    let attempt = 0;
    let lastError;

    while (attempt < strategy.maxRetries) {
      try {
        attempt++;
        
        if (attempt > 1) {
          const delay = strategy.exponentialBackoff 
            ? strategy.retryDelay * Math.pow(2, attempt - 2)
            : strategy.retryDelay;
          
          await loggingService.info(`Retrying operation, attempt ${attempt}/${strategy.maxRetries}`, {
            errorType,
            delay,
            context
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return await operation();
        
      } catch (error) {
        lastError = error;
        
        await loggingService.warn(`Operation failed, attempt ${attempt}/${strategy.maxRetries}`, {
          error: error.message,
          errorType,
          context
        });
        
        // If not recoverable, don't retry
        if (!this.isRecoverableError(error, errorType)) {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Circuit breaker pattern for external services
   */
  async executeWithCircuitBreaker(serviceId, operation, options = {}) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 30000,
      monitoringPeriod = 60000
    } = options;

    if (!this.circuitBreakers.has(serviceId)) {
      this.circuitBreakers.set(serviceId, {
        state: 'CLOSED',
        failures: 0,
        lastFailureTime: null,
        nextAttemptTime: null
      });
    }

    const breaker = this.circuitBreakers.get(serviceId);
    const now = Date.now();

    // Check if circuit is open
    if (breaker.state === 'OPEN') {
      if (now < breaker.nextAttemptTime) {
        throw new Error(`Service ${serviceId} is temporarily unavailable (circuit breaker open)`);
      } else {
        breaker.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        await loggingService.info(`Circuit breaker closed for service: ${serviceId}`);
      }
      
      return result;
      
    } catch (error) {
      breaker.failures++;
      breaker.lastFailureTime = now;
      
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'OPEN';
        breaker.nextAttemptTime = now + recoveryTimeout;
        
        await loggingService.error(`Circuit breaker opened for service: ${serviceId}`, {
          failures: breaker.failures,
          threshold: failureThreshold,
          recoveryTimeout
        });
      }
      
      throw error;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const stats = {
      total_patterns: this.errorPatterns.size,
      active_circuit_breakers: Array.from(this.circuitBreakers.values())
        .filter(cb => cb.state !== 'CLOSED').length,
      recent_errors: 0,
      error_types: {}
    };

    // Calculate recent errors and group by type
    for (const [pattern, data] of this.errorPatterns.entries()) {
      const recentCount = data.recent.filter(time => time > oneHourAgo).length;
      stats.recent_errors += recentCount;
      
      const [type] = pattern.split('_');
      if (!stats.error_types[type]) {
        stats.error_types[type] = 0;
      }
      stats.error_types[type] += recentCount;
    }

    return stats;
  }

  /**
   * Clean up old error data
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean up old error patterns
    for (const [pattern, data] of this.errorPatterns.entries()) {
      data.recent = data.recent.filter(time => time > oneHourAgo);
      
      // Remove patterns with no recent errors
      if (data.recent.length === 0 && data.lastSeen < oneHourAgo) {
        this.errorPatterns.delete(pattern);
      }
    }
    
    // Reset circuit breakers that have been closed for a while
    for (const [serviceId, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'CLOSED' && 
          breaker.lastFailureTime && 
          (now - breaker.lastFailureTime) > 3600000) {
        breaker.failures = 0;
        breaker.lastFailureTime = null;
      }
    }
  }

  /**
   * Shutdown error handling service
   */
  async shutdown() {
    await loggingService.info('Error handling service shutting down');
    
    // Log final error statistics
    const stats = this.getErrorStats();
    await loggingService.info('Final error handling statistics', stats);
    
    this.cleanup();
  }
}

// Create and export singleton instance
const errorHandlingService = new ErrorHandlingService();

// Set up periodic cleanup
setInterval(() => {
  errorHandlingService.cleanup();
}, 300000); // Every 5 minutes

export default errorHandlingService;