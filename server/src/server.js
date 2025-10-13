import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

import app, { initializePrisma, setupMultiDocumentProcessor } from './app.js';
import structuredExtractionService from './services/structuredExtractionService.js';

// Reinitialize Prisma now that env is loaded (with timeout)
try {
  await Promise.race([
    initializePrisma(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    )
  ]);
} catch (error) {
  console.warn('⚠️ Database initialization failed:', error.message);
  console.warn('⚠️ Server will start without database connection');
}

// Initialize structured extraction service
console.log('🔧 Initializing Structured Extraction Service...');
try {
  const isAvailable = await structuredExtractionService.initialize();
  if (isAvailable) {
    console.log('✅ Structured Extraction Service initialized and ready');
  } else {
    console.log('⚠️  Structured Extraction Service not available (spec files not found)');
  }
} catch (error) {
  console.warn('⚠️  Structured Extraction Service initialization failed:', error.message);
  console.warn('⚠️  Server will use generic extraction only');
}

const PORT = process.env.PORT || 4003;

// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Set up multi-document processor with Socket.io
setupMultiDocumentProcessor(io);

// Make Socket.IO available to routes via app.set
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`📡 Bloom Energy Contract System Server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for multi-document processing`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 AI Provider: ${process.env.DEFAULT_AI_PROVIDER || 'Not configured'}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
