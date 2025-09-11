import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Test database connection
    const result = await req.prisma.$queryRaw`SELECT 1 as test`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Detailed system info
router.get('/system', async (req, res) => {
  try {
    // Get database statistics
    const contractCount = await req.prisma.contract.count();
    const templateCount = await req.prisma.contractTemplate.count();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: {
        node_version: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      database: {
        status: 'connected',
        contracts: contractCount,
        templates: templateCount
      }
    });
  } catch (error) {
    console.error('System health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;