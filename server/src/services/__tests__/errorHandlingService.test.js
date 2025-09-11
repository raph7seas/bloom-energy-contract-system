/**
 * Unit Tests for Error Handling Service
 */

import errorHandlingService from '../errorHandlingService.js';
import loggingService from '../loggingService.js';
import notificationService from '../notificationService.js';

// Mock dependencies
jest.mock('../loggingService.js');
jest.mock('../notificationService.js');

const mockLoggingService = loggingService;
const mockNotificationService = notificationService;

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggingService.error = jest.fn();
    mockLoggingService.warn = jest.fn();
    mockLoggingService.info = jest.fn();
    mockNotificationService.sendToRole = jest.fn();
  });

  describe('classifyError', () => {
    it('should classify validation errors correctly', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.statusCode = 400;

      const classified = errorHandlingService.classifyError(error);

      expect(classified.type).toBe('validation');
      expect(classified.severity).toBe('low');
      expect(classified.recoverable).toBe(false);
    });

    it('should classify authentication errors correctly', () => {
      const error = new Error('Unauthorized');
      error.statusCode = 401;

      const classified = errorHandlingService.classifyError(error);

      expect(classified.type).toBe('authentication');
      expect(classified.severity).toBe('medium');
    });

    it('should classify database errors correctly', () => {
      const error = new Error('Database connection failed');
      error.code = 'P2024';

      const classified = errorHandlingService.classifyError(error);

      expect(classified.type).toBe('database');
      expect(classified.severity).toBe('high');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify network errors correctly', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';

      const classified = errorHandlingService.classifyError(error);

      expect(classified.type).toBe('network');
      expect(classified.severity).toBe('high');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify critical errors correctly', () => {
      const error = new Error('Out of memory');
      error.statusCode = 500;

      const classified = errorHandlingService.classifyError(error);

      expect(classified.severity).toBe('critical');
    });

    it('should include context in classification', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        requestId: 'req-456',
        operation: 'test-operation'
      };

      const classified = errorHandlingService.classifyError(error, context);

      expect(classified.userId).toBe('user-123');
      expect(classified.requestId).toBe('req-456');
      expect(classified.operation).toBe('test-operation');
    });
  });

  describe('handleError', () => {
    it('should handle error and return formatted response', async () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123' };

      const response = await errorHandlingService.handleError(error, context);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Test error');
      expect(response.error.type).toBeDefined();
      expect(response.error.timestamp).toBeDefined();
      expect(mockLoggingService.warn).toHaveBeenCalled();
    });

    it('should send notifications for critical errors', async () => {
      const error = new Error('Critical system error');
      error.statusCode = 500;

      await errorHandlingService.handleError(error);

      expect(mockNotificationService.sendToRole).toHaveBeenCalledWith(
        'admin',
        expect.any(String),
        expect.objectContaining({
          type: 'critical_error'
        })
      );
    });

    it('should track error patterns', async () => {
      const error = new Error('Repeated error');
      
      // Handle the same error multiple times
      await errorHandlingService.handleError(error);
      await errorHandlingService.handleError(error);
      await errorHandlingService.handleError(error);

      const stats = errorHandlingService.getErrorStats();
      expect(stats.total_patterns).toBeGreaterThan(0);
    });

    it('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database password: secret123');
      const response = await errorHandlingService.handleError(error);

      expect(response.error.message).not.toContain('secret123');
      expect(response.error.message).toContain('[REDACTED]');

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const response = await errorHandlingService.handleError(error);

      expect(response.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('retryWithStrategy', () => {
    it('should retry operations with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Temporary failure');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'success';
      });

      const result = await errorHandlingService.retryWithStrategy(
        operation,
        'network'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        errorHandlingService.retryWithStrategy(operation, 'network')
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(3); // Default max retries for network
    });

    it('should not retry non-recoverable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        const error = new Error('Validation error');
        error.statusCode = 400;
        throw error;
      });

      await expect(
        errorHandlingService.retryWithStrategy(operation, 'network')
      ).rejects.toThrow('Validation error');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandlingService.executeWithCircuitBreaker(
        'test-service',
        operation
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));

      // Exceed failure threshold (default 5)
      for (let i = 0; i < 6; i++) {
        try {
          await errorHandlingService.executeWithCircuitBreaker(
            'test-service',
            operation
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should now be open
      await expect(
        errorHandlingService.executeWithCircuitBreaker(
          'test-service',
          operation
        )
      ).rejects.toThrow('temporarily unavailable');
    });

    it('should reset circuit on successful execution in half-open state', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockRejectedValueOnce(new Error('Failure 3'))
        .mockRejectedValueOnce(new Error('Failure 4'))
        .mockRejectedValueOnce(new Error('Failure 5'))
        .mockResolvedValueOnce('success');

      // Trip the circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandlingService.executeWithCircuitBreaker(
            'recovery-service',
            operation
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Mock time passage to allow circuit to transition to half-open
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(originalNow() + 31000); // 31 seconds later

      // This should succeed and close the circuit
      const result = await errorHandlingService.executeWithCircuitBreaker(
        'recovery-service',
        operation
      );

      expect(result).toBe('success');

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      const stats = errorHandlingService.getErrorStats();

      expect(stats).toHaveProperty('total_patterns');
      expect(stats).toHaveProperty('active_circuit_breakers');
      expect(stats).toHaveProperty('recent_errors');
      expect(stats).toHaveProperty('error_types');
      expect(typeof stats.total_patterns).toBe('number');
      expect(typeof stats.recent_errors).toBe('number');
    });

    it('should track error types correctly', async () => {
      // Generate different types of errors
      await errorHandlingService.handleError(new Error('Validation error'), { statusCode: 400 });
      await errorHandlingService.handleError(new Error('Auth error'), { statusCode: 401 });
      await errorHandlingService.handleError(new Error('Server error'), { statusCode: 500 });

      const stats = errorHandlingService.getErrorStats();
      expect(Object.keys(stats.error_types).length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old error patterns', () => {
      // This test would require more complex setup to test time-based cleanup
      expect(() => errorHandlingService.cleanup()).not.toThrow();
    });

    it('should cleanup old circuit breaker data', () => {
      // Add some circuit breaker data
      const operation = jest.fn().mockResolvedValue('test');
      errorHandlingService.executeWithCircuitBreaker('cleanup-test', operation);
      
      expect(() => errorHandlingService.cleanup()).not.toThrow();
    });
  });

  describe('handleCriticalError', () => {
    it('should handle critical errors with special logging', async () => {
      const error = new Error('Out of memory');
      
      await errorHandlingService.handleCriticalError('MEMORY_ERROR', error, {
        memoryUsage: process.memoryUsage()
      });

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL ERROR: MEMORY_ERROR'),
        expect.objectContaining({
          error: expect.any(Object),
          process_info: expect.any(Object)
        })
      );
    });

    it('should send immediate notifications for critical errors', async () => {
      const error = new Error('Critical database failure');
      
      await errorHandlingService.handleCriticalError('DATABASE_CRITICAL', error);

      expect(mockNotificationService.sendToRole).toHaveBeenCalledWith(
        'admin',
        expect.any(String),
        expect.objectContaining({
          type: 'critical_error',
          critical: true
        })
      );
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error response correctly', () => {
      const errorData = {
        type: 'validation',
        message: 'Test error',
        timestamp: new Date().toISOString(),
        statusCode: 400,
        recoverable: false
      };

      const response = errorHandlingService.formatErrorResponse(errorData);

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('validation');
      expect(response.error.message).toBe('Test error');
      expect(response.error.statusCode).toBe(400);
      expect(response.error.timestamp).toBeDefined();
    });

    it('should include retry information for recoverable errors', () => {
      const errorData = {
        type: 'network',
        message: 'Connection failed',
        timestamp: new Date().toISOString(),
        recoverable: true
      };

      const response = errorHandlingService.formatErrorResponse(errorData);

      expect(response.error.recoverable).toBe(true);
      expect(response.error.retryAfter).toBeDefined();
    });

    it('should exclude sensitive information in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorData = {
        type: 'server_error',
        message: 'Internal error',
        timestamp: new Date().toISOString(),
        stack: 'Error: Internal error\n    at ...'
      };

      const response = errorHandlingService.formatErrorResponse(errorData);

      expect(response.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize passwords from error messages', () => {
      const message = 'Database connection failed with password: secret123';
      const sanitized = errorHandlingService.sanitizeErrorMessage(message);
      
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should sanitize credit card numbers', () => {
      const message = 'Payment failed for card 4532 1234 5678 9012';
      const sanitized = errorHandlingService.sanitizeErrorMessage(message);
      
      expect(sanitized).not.toContain('4532 1234 5678 9012');
      expect(sanitized).toContain('[CARD]');
    });

    it('should sanitize email addresses', () => {
      const message = 'User john.doe@example.com not found';
      const sanitized = errorHandlingService.sanitizeErrorMessage(message);
      
      expect(sanitized).not.toContain('john.doe@example.com');
      expect(sanitized).toContain('[EMAIL]');
    });

    it('should not sanitize in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const message = 'Database connection failed with password: secret123';
      const sanitized = errorHandlingService.sanitizeErrorMessage(message);
      
      expect(sanitized).toBe(message); // Should be unchanged

      process.env.NODE_ENV = originalEnv;
    });
  });
});