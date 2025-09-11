/**
 * Comprehensive Logging Service
 * Centralized logging with multiple transports and structured data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LoggingService {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE || './logs/application.log';
    this.errorLogFile = process.env.ERROR_LOG_FILE || './logs/error.log';
    this.auditLogFile = process.env.AUDIT_LOG_FILE || './logs/audit.log';
    this.performanceLogFile = process.env.PERFORMANCE_LOG_FILE || './logs/performance.log';
    
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6
    };
    
    this.currentLogLevel = this.logLevels[this.logLevel] || this.logLevels.info;
    
    // Initialize log directories
    this.initializeLogDirectories();
    
    // Log rotation settings
    this.maxLogSize = parseInt(process.env.MAX_LOG_SIZE || '10485760'); // 10MB
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES || '5');
    
    // Performance tracking
    this.performanceMetrics = new Map();
    
    // Request correlation tracking
    this.requestCorrelation = new Map();
  }

  /**
   * Initialize log directories
   */
  async initializeLogDirectories() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
      console.log(`📁 Log directory initialized: ${logDir}`);
    } catch (error) {
      console.error('Failed to initialize log directories:', error);
    }
  }

  /**
   * Format log entry with structured data
   */
  formatLogEntry(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'localhost',
      service: 'bloom-contract-api'
    };

    // Add request correlation if available
    if (meta.requestId && this.requestCorrelation.has(meta.requestId)) {
      const correlationData = this.requestCorrelation.get(meta.requestId);
      logEntry.correlation = correlationData;
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Check if log level should be written
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.currentLogLevel;
  }

  /**
   * Write log entry to file
   */
  async writeToFile(filePath, content) {
    try {
      // Check file size for rotation
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > this.maxLogSize) {
          await this.rotateLogFile(filePath);
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }

      await fs.appendFile(filePath, content + '\n');
    } catch (error) {
      console.error(`Failed to write to log file ${filePath}:`, error);
    }
  }

  /**
   * Rotate log files when they exceed max size
   */
  async rotateLogFile(filePath) {
    try {
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const dirName = path.dirname(filePath);

      // Rotate existing files
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(dirName, `${baseName}.${i}${ext}`);
        const newFile = path.join(dirName, `${baseName}.${i + 1}${ext}`);
        
        try {
          await fs.rename(oldFile, newFile);
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      // Move current log to .1
      const rotatedFile = path.join(dirName, `${baseName}.1${ext}`);
      await fs.rename(filePath, rotatedFile);
      
      console.log(`📦 Log file rotated: ${filePath} -> ${rotatedFile}`);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Generic log method
   */
  async log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedEntry = this.formatLogEntry(level, message, meta);
    
    // Console output with colors
    this.logToConsole(level, message, meta);
    
    // Write to main log file
    await this.writeToFile(this.logFile, formattedEntry);
    
    // Write to specific log files
    if (level === 'error') {
      await this.writeToFile(this.errorLogFile, formattedEntry);
    }
  }

  /**
   * Console output with colors
   */
  logToConsole(level, message, meta) {
    const colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      http: '\x1b[35m',    // Magenta
      verbose: '\x1b[37m', // White
      debug: '\x1b[90m',   // Gray
      silly: '\x1b[90m'    // Gray
    };
    
    const resetColor = '\x1b[0m';
    const color = colors[level] || colors.info;
    const timestamp = new Date().toISOString();
    
    let output = `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${resetColor}`;
    
    if (Object.keys(meta).length > 0) {
      output += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    console.log(output);
  }

  /**
   * Log levels
   */
  async error(message, meta = {}) {
    // Capture stack trace for errors
    if (meta.error && meta.error.stack) {
      meta.stack = meta.error.stack;
    } else if (!meta.stack) {
      meta.stack = new Error().stack;
    }
    
    await this.log('error', message, meta);
  }

  async warn(message, meta = {}) {
    await this.log('warn', message, meta);
  }

  async info(message, meta = {}) {
    await this.log('info', message, meta);
  }

  async http(message, meta = {}) {
    await this.log('http', message, meta);
  }

  async verbose(message, meta = {}) {
    await this.log('verbose', message, meta);
  }

  async debug(message, meta = {}) {
    await this.log('debug', message, meta);
  }

  async silly(message, meta = {}) {
    await this.log('silly', message, meta);
  }

  /**
   * Audit logging for security and compliance
   */
  async audit(action, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      ...details,
      level: 'AUDIT'
    };
    
    const formattedEntry = JSON.stringify(auditEntry);
    await this.writeToFile(this.auditLogFile, formattedEntry);
    
    // Also log to main log
    await this.info(`AUDIT: ${action}`, details);
  }

  /**
   * Performance logging
   */
  async performance(operation, duration, details = {}) {
    const perfEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration_ms: duration,
      ...details,
      level: 'PERFORMANCE'
    };
    
    const formattedEntry = JSON.stringify(perfEntry);
    await this.writeToFile(this.performanceLogFile, formattedEntry);
    
    // Log slow operations as warnings
    if (duration > 5000) { // 5 seconds
      await this.warn(`Slow operation detected: ${operation}`, { duration_ms: duration, ...details });
    }
  }

  /**
   * Start performance timer
   */
  startTimer(operation, meta = {}) {
    const timerId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.performanceMetrics.set(timerId, {
      operation,
      startTime: Date.now(),
      meta
    });
    return timerId;
  }

  /**
   * End performance timer and log
   */
  async endTimer(timerId, additionalMeta = {}) {
    const timer = this.performanceMetrics.get(timerId);
    if (!timer) {
      await this.warn('Timer not found', { timerId });
      return;
    }

    const duration = Date.now() - timer.startTime;
    await this.performance(timer.operation, duration, { ...timer.meta, ...additionalMeta });
    
    this.performanceMetrics.delete(timerId);
    return duration;
  }

  /**
   * Request correlation tracking
   */
  startRequestCorrelation(requestId, requestData = {}) {
    this.requestCorrelation.set(requestId, {
      ...requestData,
      startTime: Date.now()
    });
  }

  endRequestCorrelation(requestId, responseData = {}) {
    const correlation = this.requestCorrelation.get(requestId);
    if (correlation) {
      const duration = Date.now() - correlation.startTime;
      this.requestCorrelation.delete(requestId);
      return { ...correlation, ...responseData, duration_ms: duration };
    }
    return null;
  }

  /**
   * Log HTTP requests
   */
  async logRequest(req, res, duration) {
    const requestData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      duration_ms: duration,
      requestId: req.requestId,
      userId: req.user?.id,
      contentLength: res.get('content-length'),
      referer: req.get('Referer')
    };

    if (res.statusCode >= 400) {
      await this.warn(`HTTP ${res.statusCode}: ${req.method} ${req.url}`, requestData);
    } else {
      await this.http(`${req.method} ${req.url}`, requestData);
    }

    // Log slow requests
    if (duration > 2000) { // 2 seconds
      await this.warn('Slow HTTP request', requestData);
    }
  }

  /**
   * Log database operations
   */
  async logDatabaseOperation(operation, table, duration, details = {}) {
    const dbData = {
      operation,
      table,
      duration_ms: duration,
      ...details
    };

    await this.debug(`DB: ${operation} ${table}`, dbData);
    
    // Log slow queries
    if (duration > 1000) { // 1 second
      await this.warn('Slow database query', dbData);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(event, userId, details = {}) {
    const authData = {
      event,
      userId,
      ...details,
      ip: details.ip,
      userAgent: details.userAgent
    };

    await this.audit(`AUTH_${event.toUpperCase()}`, authData);
    
    if (event === 'login_failed' || event === 'access_denied') {
      await this.warn(`Authentication ${event}`, authData);
    } else {
      await this.info(`Authentication ${event}`, authData);
    }
  }

  /**
   * Log file operations
   */
  async logFileOperation(operation, filename, size, details = {}) {
    const fileData = {
      operation,
      filename,
      size_bytes: size,
      ...details
    };

    await this.info(`FILE: ${operation} ${filename}`, fileData);
    
    // Audit file uploads and deletions
    if (operation === 'upload' || operation === 'delete') {
      await this.audit(`FILE_${operation.toUpperCase()}`, fileData);
    }
  }

  /**
   * Log AI operations
   */
  async logAIOperation(operation, model, tokens, cost, details = {}) {
    const aiData = {
      operation,
      model,
      tokens_used: tokens,
      estimated_cost: cost,
      ...details
    };

    await this.info(`AI: ${operation} with ${model}`, aiData);
    await this.performance(`ai_${operation}`, details.duration_ms || 0, aiData);
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(operation, itemCount, successCount, failureCount, duration, details = {}) {
    const bulkData = {
      operation,
      total_items: itemCount,
      successful_items: successCount,
      failed_items: failureCount,
      duration_ms: duration,
      success_rate: ((successCount / itemCount) * 100).toFixed(2) + '%',
      ...details
    };

    await this.info(`BULK: ${operation} completed`, bulkData);
    await this.performance(`bulk_${operation}`, duration, bulkData);
    
    if (failureCount > 0) {
      await this.warn(`Bulk operation had failures`, bulkData);
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    const stats = {
      currentLogLevel: this.logLevel,
      activeTimers: this.performanceMetrics.size,
      activeCorrelations: this.requestCorrelation.size,
      logFiles: {}
    };

    // Get log file sizes
    const logFiles = [this.logFile, this.errorLogFile, this.auditLogFile, this.performanceLogFile];
    
    for (const file of logFiles) {
      try {
        const stat = await fs.stat(file);
        stats.logFiles[path.basename(file)] = {
          size_bytes: stat.size,
          size_mb: (stat.size / 1024 / 1024).toFixed(2),
          modified: stat.mtime
        };
      } catch (error) {
        stats.logFiles[path.basename(file)] = { status: 'not_found' };
      }
    }

    return stats;
  }

  /**
   * Clean up old timers and correlations
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    // Clean up old performance timers
    for (const [timerId, timer] of this.performanceMetrics.entries()) {
      if (now - timer.startTime > maxAge) {
        this.performanceMetrics.delete(timerId);
        this.warn('Cleaning up orphaned performance timer', { timerId, operation: timer.operation });
      }
    }

    // Clean up old request correlations
    for (const [requestId, correlation] of this.requestCorrelation.entries()) {
      if (now - correlation.startTime > maxAge) {
        this.requestCorrelation.delete(requestId);
        this.warn('Cleaning up orphaned request correlation', { requestId });
      }
    }
  }

  /**
   * Shutdown logging service
   */
  async shutdown() {
    this.info('Logging service shutting down');
    
    // Clean up any remaining timers
    this.cleanup();
    
    // Log final statistics
    const stats = await this.getLogStats();
    this.info('Final logging statistics', stats);
  }
}

// Create and export singleton instance
const loggingService = new LoggingService();

// Set up periodic cleanup
setInterval(() => {
  loggingService.cleanup();
}, 300000); // Every 5 minutes

export default loggingService;