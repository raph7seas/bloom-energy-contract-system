import { ValidationError } from '../services/validationService.js';
import loggingService from '../services/loggingService.js';
import errorHandlingService from '../services/errorHandlingService.js';

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Main error handling middleware
export const errorHandler = async (err, req, res, next) => {
  try {
    // Use comprehensive error handling service
    const context = {
      requestId: req.id || req.requestId,
      userId: req.user?.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    };

    const errorResponse = await errorHandlingService.handleError(err, context);
    
    // End request correlation if available
    if (req.id) {
      loggingService.endRequestCorrelation(req.id, {
        statusCode: errorResponse.error.statusCode,
        error: true
      });
    }

    return res.status(errorResponse.error.statusCode || 500).json(errorResponse);
  } catch (handlingError) {
    // Fallback error handling if our error handler fails
    console.error('Error in error handler:', handlingError);
    
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

  // Handle specific error types
  
  // Validation errors (Joi)
  if (err instanceof ValidationError || err.name === 'ValidationError') {
    error = new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.errors || [{ message: err.message }]
    );
  }

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File size too large', 400, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new AppError('Too many files', 400, 'TOO_MANY_FILES');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // MongoDB/Database connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    error = new AppError('Database error', 500, 'DATABASE_ERROR');
  }

  // Network/API errors
  if (err.code === 'ECONNREFUSED') {
    error = new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
  }

  if (err.code === 'ENOTFOUND') {
    error = new AppError('External service not found', 502, 'EXTERNAL_SERVICE_ERROR');
  }

  // Default to AppError if not already
  if (!(error instanceof AppError)) {
    error = new AppError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      500,
      'INTERNAL_SERVER_ERROR'
    );
  }

  // Send error response
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add details in development or for operational errors
  if (process.env.NODE_ENV !== 'production' || error.isOperational) {
    if (error.details) {
      response.error.details = error.details;
    }
    
    if (process.env.NODE_ENV !== 'production' && error.stack) {
      response.error.stack = error.stack;
    }
  }

  // Add request ID if available
  if (req.id || req.requestId) {
    response.requestId = req.id || req.requestId;
  }

  // Log error details for monitoring
  if (error.statusCode >= 500) {
    console.error('SERVER ERROR:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      path: req.originalUrl,
      method: req.method,
      user: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      stack: error.stack
    });
  }

    res.status(error.statusCode).json(response);
  }
};

// Handle Prisma-specific errors
const handlePrismaError = (err) => {
  const { code, meta } = err;

  switch (code) {
    case 'P2000':
      return new AppError('The provided value is too long', 400, 'VALUE_TOO_LONG', { 
        field: meta?.target 
      });

    case 'P2001':
      return new NotFoundError('Record', meta?.cause);

    case 'P2002':
      return new ConflictError(
        `A record with this ${meta?.target?.[0] || 'field'} already exists`,
        { field: meta?.target?.[0], constraint: 'unique' }
      );

    case 'P2003':
      return new AppError('Foreign key constraint failed', 400, 'FOREIGN_KEY_ERROR', {
        field: meta?.field_name
      });

    case 'P2004':
      return new AppError('A constraint failed on the database', 400, 'CONSTRAINT_ERROR');

    case 'P2005':
      return new AppError('The value stored in the database is invalid', 400, 'INVALID_VALUE', {
        field: meta?.field_name
      });

    case 'P2006':
      return new AppError('The provided value is not valid', 400, 'INVALID_VALUE', {
        field: meta?.field_name
      });

    case 'P2007':
      return new AppError('Data validation error', 400, 'VALIDATION_ERROR', {
        field: meta?.field_name
      });

    case 'P2008':
      return new AppError('Failed to parse the query', 400, 'QUERY_PARSE_ERROR');

    case 'P2009':
      return new AppError('Failed to validate the query', 400, 'QUERY_VALIDATION_ERROR');

    case 'P2010':
      return new AppError('Raw query failed', 500, 'RAW_QUERY_ERROR');

    case 'P2011':
      return new AppError('Null constraint violation', 400, 'NULL_CONSTRAINT_ERROR', {
        field: meta?.field_name
      });

    case 'P2012':
      return new AppError('Missing a required value', 400, 'MISSING_REQUIRED_VALUE', {
        field: meta?.field_name
      });

    case 'P2013':
      return new AppError('Missing the required argument', 400, 'MISSING_ARGUMENT', {
        argument: meta?.argument_name
      });

    case 'P2014':
      return new AppError('The change would violate a relation', 400, 'RELATION_VIOLATION', {
        relation: meta?.relation_name
      });

    case 'P2015':
      return new NotFoundError('Related record', meta?.details);

    case 'P2016':
      return new AppError('Query interpretation error', 400, 'QUERY_INTERPRETATION_ERROR');

    case 'P2017':
      return new AppError('The records are not connected', 400, 'RECORDS_NOT_CONNECTED');

    case 'P2018':
      return new NotFoundError('Connected records');

    case 'P2019':
      return new AppError('Input error', 400, 'INPUT_ERROR');

    case 'P2020':
      return new AppError('Value out of range', 400, 'VALUE_OUT_OF_RANGE', {
        field: meta?.field_name
      });

    case 'P2021':
      return new AppError('The table does not exist', 500, 'TABLE_NOT_EXISTS', {
        table: meta?.table
      });

    case 'P2022':
      return new AppError('The column does not exist', 500, 'COLUMN_NOT_EXISTS', {
        column: meta?.column
      });

    case 'P2023':
      return new AppError('Inconsistent column data', 500, 'INCONSISTENT_COLUMN_DATA');

    case 'P2024':
      return new AppError('Timed out fetching a new connection', 500, 'CONNECTION_TIMEOUT');

    case 'P2025':
      return new NotFoundError('Record');

    case 'P2026':
      return new AppError('Database query does not support this feature', 400, 'UNSUPPORTED_FEATURE');

    case 'P2027':
      return new AppError('Multiple errors occurred', 400, 'MULTIPLE_ERRORS');

    default:
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR', { 
        prismaCode: code 
      });
  }
};

// 404 handler for unmatched routes
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  error.details = {
    path: req.originalUrl,
    method: req.method,
    message: `Route ${req.method} ${req.originalUrl} not found`
  };
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request timeout middleware
export const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      const error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
      next(error);
    });
    next();
  };
};

// Rate limiting helper
export const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP'
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request log for this IP
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const ipRequests = requests.get(ip);
    
    // Remove old requests outside the window
    const recentRequests = ipRequests.filter(time => time > windowStart);
    requests.set(ip, recentRequests);

    // Check if over limit
    if (recentRequests.length >= max) {
      const error = new RateLimitError(message);
      return next(error);
    }

    // Add this request
    recentRequests.push(now);
    next();
  };
};

// Request ID middleware
export const requestId = (req, res, next) => {
  req.id = req.get('X-Request-ID') || 
           req.get('X-Correlation-ID') || 
           generateRequestId();
  res.set('X-Request-ID', req.id);
  next();
};

// Generate unique request ID
const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });

  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Enhanced request logging middleware with comprehensive logging service
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Start request correlation if request ID exists
  if (req.id) {
    loggingService.startRequestCorrelation(req.id, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }
  
  // Log request start
  loggingService.http(`${req.method} ${req.originalUrl}`, {
    requestId: req.id,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    referer: req.get('Referer')
  });
  
  // Log response when finished
  res.on('finish', async () => {
    const duration = Date.now() - start;
    
    // Log the completed request
    await loggingService.logRequest(req, res, duration);
    
    // End request correlation
    if (req.id) {
      const correlationData = loggingService.endRequestCorrelation(req.id, {
        statusCode: res.statusCode,
        contentLength: res.get('content-length')
      });
      
      // Log performance data
      if (correlationData) {
        await loggingService.performance('http_request', duration, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          userId: req.user?.id,
          requestId: req.id
        });
      }
    }
  });
  
  next();
};