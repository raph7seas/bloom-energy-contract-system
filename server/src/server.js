import app from './app.js';
import { createServer } from 'http';
import notificationService from './services/notificationService.js';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
notificationService.initialize(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Bloom Energy Contract API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Connected to PostgreSQL`);
  console.log(`🔔 WebSocket notifications: Enabled`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down gracefully...');
  
  notificationService.shutdown();
  
  server.close(() => {
    console.log('✅ Server shut down complete');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down gracefully...');
  
  notificationService.shutdown();
  
  server.close(() => {
    console.log('✅ Server shut down complete');
    process.exit(0);
  });
});