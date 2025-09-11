import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '../../generated/prisma/index.js';

// Import routes
import contractRoutes from './routes/contracts.js';
import healthRoutes from './routes/health.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/uploads.js';
import documentRoutes from './routes/documents.js';
import rulesRoutes from './routes/rules.js';
import auditRoutes from './routes/audit.js';
import templateRoutes from './routes/templates.js';
import learningRoutes from './routes/learning.js';
import textractRoutes from './routes/textract.js';
import bulkRoutes from './routes/bulk.js';
import notificationRoutes from './routes/notifications.js';
import monitoringRoutes from './routes/monitoring.js';

// Import middleware
import { authenticate, authorize, optionalAuth } from './middleware/auth.js';
import { 
  errorHandler, 
  notFoundHandler, 
  requestId, 
  securityHeaders, 
  requestLogger,
  requestTimeout 
} from './middleware/errorHandler.js';
import ValidationService from './services/validationService.js';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const validationService = new ValidationService();

// Security and request middleware (order matters)
app.use(requestId);
app.use(securityHeaders);
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4000', 'http://localhost:4001', 'http://localhost:4002'],
  credentials: true
}));

app.use(requestTimeout(300000)); // 5 minute timeout for large uploads
app.use(express.json({ limit: '100mb' })); // Increased for large file metadata
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Enhanced request logging
app.use(requestLogger);

// Make services available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.validationService = validationService;
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/documents', optionalAuth, documentRoutes); // Enhanced multi-document upload system
app.use('/api/contracts', optionalAuth, contractRoutes); // Optional auth for now to maintain compatibility
app.use('/api/ai', optionalAuth, aiRoutes); // AI endpoints with optional auth for dashboard
app.use('/api/rules', rulesRoutes); // Rule extraction and management
app.use('/api/audit', auditRoutes); // Audit trail and version control
app.use('/api/templates', templateRoutes); // Contract templates system
app.use('/api/learning', learningRoutes); // Real-time rule learning system
app.use('/api/textract', textractRoutes); // Local AWS Textract compatible OCR service
app.use('/api/bulk', bulkRoutes); // Bulk operations for contract management
app.use('/api/notifications', notificationRoutes); // Real-time notifications and WebSocket management
app.use('/api/monitoring', monitoringRoutes); // System monitoring, logging, and error tracking

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Bloom Energy Contract Learning & Rules Management System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unmatched routes (before error handler)
app.use(notFoundHandler);

// Comprehensive error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;