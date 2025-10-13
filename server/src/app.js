// Import all dependencies
// Note: .env is loaded in server.js before app.js is imported
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import aiService from './services/aiService.js';
import documentChunker from './services/documentChunker.js';
import { buildContractBlueprint } from './services/contractBlueprintService.js';
import MultiDocumentProcessor from './services/multiDocumentProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Optional Prisma client - only initialize if database is configured
let prisma = null;

// Function to initialize Prisma - will be called from server.js after env is loaded
export async function initializePrisma() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('🔍 DATABASE_URL found, attempting to load Prisma client...');
      try {
        // Dynamically import the Prisma client from custom location
        const { PrismaClient } = await import('../../generated/prisma/index.js');
        prisma = new PrismaClient();
        await prisma.$connect();
        console.log('✅ Prisma client connected successfully');
      } catch (prismaError) {
        console.warn('⚠️  Prisma client import/connect failed:', prismaError.message);
        console.warn('⚠️  Running in fallback mode - use admin@bloomenergy.com / admin123');
        prisma = null;
      }
    } else {
      console.log('❌ No DATABASE_URL configured - running without database');
    }
  } catch (error) {
    console.warn('⚠️  Prisma initialization failed:', error.message);
    console.warn('⚠️  Server will run in fallback mode without database');
    prisma = null;
  }
  return prisma;
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }
  return Number(value).toFixed(decimals);
}

function buildContractNarrative(formData) {
  if (!formData) return '';
  const parts = [];
  parts.push(`Proposed ${formData.solutionType} agreement for ${formData.customerName}`);
  parts.push(`servicing ${formData.siteLocation}`);
  parts.push(`with a ${formData.ratedCapacity} kW capacity over a ${formData.contractTerm}-year term`);
  parts.push(`at $${formatNumber(formData.baseRate, 3)}/kWh with ${formatNumber(formData.annualEscalation, 2)}% annual escalation.`);
  parts.push(`Operating guarantees include ${formatNumber(formData.outputWarrantyPercent, 1)}% availability and ${formatNumber(formData.efficiencyWarrantyPercent, 1)}% efficiency.`);
  parts.push(`Grid interface is configured for ${formData.gridParallelVoltage} with ${formData.numberOfServers} server(s) and components: ${Array.isArray(formData.selectedComponents) ? formData.selectedComponents.join(', ') : formData.selectedComponents}.`);
  if (formData.includeRECs) {
    parts.push(`RECs included (${formData.recType}).`);
  }
  return parts.join(' ');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:4000', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};
app.use(cors(corsOptions));

// Rate limiting - temporarily disabled for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
  message: { error: 'Too many requests, please try again later' }
});
// app.use(limiter); // Temporarily disabled

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lightweight request logger for debugging
app.use((req, res, next) => {
  if (process.env.REQUEST_LOGGING !== 'disabled') {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured'
    }
  });
});

// Basic auth endpoints - DISABLED (using auth.js route instead)
// app.post('/api/auth/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//
//     // For development, use simple auth
//     if (username === 'admin' && password === 'admin') {
//       res.json({
//         token: 'development-token',
//         user: {
//           id: 'f7bbdbdb-28d5-4aeb-b9b9-bb41ba2ac78e',
//           username: 'admin',
//           role: 'admin'
//         }
//       });
//     } else {
//       res.status(401).json({ error: 'Invalid credentials' });
//     }
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.get('/api/auth/me', (req, res) => {
  // For development, return default user
  res.json({
    id: 'f7bbdbdb-28d5-4aeb-b9b9-bb41ba2ac78e',
    username: 'admin',
    role: 'admin'
  });
});

// Contracts endpoints
app.get('/api/contracts', async (req, res) => {
  try {
    console.log('🔍 Contracts endpoint called');

    let contracts = [];

    // Get contracts from database if Prisma available
    if (prisma) {
      console.log('✅ Prisma instance available, querying contracts...');
      const dbContracts = await prisma.contract.findMany({
        orderBy: { createdAt: 'desc' }
      });
      contracts = [...dbContracts];
      console.log(`📊 Found ${dbContracts.length} contracts in database`);
    }

    // Add in-memory contracts
    if (global.contracts && Array.isArray(global.contracts)) {
      console.log(`📝 Found ${global.contracts.length} contracts in memory`);
      contracts = [...contracts, ...global.contracts];
    }

    // Sort by creation date (newest first)
    contracts.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    console.log(`📊 Returning total of ${contracts.length} contracts`);
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

app.get('/api/contracts/:id', async (req, res) => {
  try {
    let contract = null;

    // Try database first if Prisma available
    if (prisma) {
      contract = await prisma.contract.findUnique({
        where: { id: req.params.id },
        include: {
          uploads: true
        }
      });
    }

    // If not found in database, check in-memory storage
    if (!contract && global.contracts && Array.isArray(global.contracts)) {
      contract = global.contracts.find(c => c.id === req.params.id);
    }

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// Documents endpoints
app.get('/api/contracts/:contractId/documents', async (req, res) => {
  try {
    if (!prisma) {
      return res.json([]);
    }
    const documents = await prisma.uploadedFile.findMany({
      where: { contractId: req.params.contractId },
      orderBy: { uploadDate: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Document upload endpoint - basic implementation
app.post('/api/contracts/:contractId/documents/upload', (req, res) => {
  // This is a placeholder - the actual upload logic will need to be implemented
  res.json({
    message: 'Upload endpoint available',
    contractId: req.params.contractId,
    note: 'Full upload implementation required'
  });
});

// AI Analytics endpoint for dashboard
app.get('/api/ai/analytics', (req, res) => {
  try {
    // Return mock analytics data for the dashboard
    res.json({
      success: true,
      analytics: {
        totalQueries: 1247,
        optimizationsSuggested: 342,
        averageResponseTime: 1.8,
        costSavings: 125000,
        topModels: [
          { model: 'claude-3-sonnet', usage: 68, cost: 89.45 },
          { model: 'gpt-4', usage: 22, cost: 156.32 },
          { model: 'claude-3-haiku', usage: 10, cost: 23.12 }
        ],
        weeklyStats: [
          { week: 'Week 1', queries: 285, optimizations: 78, cost: 34.56 },
          { week: 'Week 2', queries: 312, optimizations: 89, cost: 42.18 },
          { week: 'Week 3', queries: 298, optimizations: 82, cost: 38.91 },
          { week: 'Week 4', queries: 352, optimizations: 93, cost: 48.23 }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI analytics',
      details: error.message 
    });
  }
});

// AI Health endpoint for dashboard
app.get('/api/ai/health', (req, res) => {
  try {
    // Return mock health status for AI services
    const isConfigured = !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY;
    const status = isConfigured ? 'healthy' : 'degraded';
    
    res.json({
      status: status,
      initialized: isConfigured,
      providers: [
        {
          name: 'Anthropic',
          status: process.env.ANTHROPIC_API_KEY ? 'connected' : 'not_configured',
          models: process.env.ANTHROPIC_API_KEY ? ['claude-3-sonnet', 'claude-3-haiku'] : []
        },
        {
          name: 'OpenAI', 
          status: process.env.OPENAI_API_KEY ? 'connected' : 'not_configured',
          models: process.env.OPENAI_API_KEY ? ['gpt-4', 'gpt-3.5-turbo'] : []
        }
      ],
      capabilities: [
        'contract_optimization',
        'term_suggestions', 
        'document_analysis',
        'cost_estimation'
      ],
      lastCheck: new Date().toISOString(),
      uptime: Math.floor(Math.random() * 100) + 95, // Mock uptime percentage
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Health error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Document management endpoints - matching frontend expectations
app.get('/api/documents/contracts/:contractId/documents', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // Check in-memory store first (for recently uploaded documents)
    const memoryDocuments = global.uploadedDocuments?.[contractId] || [];
    
    // If we have Prisma, also check the database
    let dbDocuments = [];
    if (prisma) {
      try {
        dbDocuments = await prisma.uploadedFile.findMany({
          where: { contractId: contractId },
          orderBy: { uploadDate: 'desc' }
        });
      } catch (dbError) {
        console.warn('Database query failed, using memory store only:', dbError.message);
      }
    }
    
    // Combine both sources (memory takes precedence for recent uploads)
    const allDocuments = [...memoryDocuments, ...dbDocuments];
    
    console.log(`📋 Retrieved ${allDocuments.length} documents for contract ${contractId}`);
    
    res.json({ documents: allDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Document upload initialization endpoint
app.post('/api/documents/contracts/:contractId/upload/init', (req, res) => {
  const { contractId } = req.params;
  const { fileName, fileSize, fileType, chunkCount } = req.body;
  
  // Mock response for document upload initialization
  res.json({
    success: true,
    documentId: `doc_${Date.now()}`,
    uploadUrl: `/api/documents/upload`,
    chunkSize: 1024 * 1024, // 1MB chunks
    maxChunks: chunkCount || Math.ceil(fileSize / (1024 * 1024)),
    message: 'Upload initialized successfully'
  });
});

// Document content endpoints for different operations
app.get('/api/documents/documents/:documentId/content', (req, res) => {
  // Mock document content response
  res.json({
    success: true,
    content: {
      extractedText: 'Sample contract content would be here...',
      pageCount: 5,
      wordCount: 1250,
      processingStatus: 'completed',
      confidence: 0.95
    }
  });
});

// Document retry processing
app.post('/api/documents/documents/:documentId/retry', (req, res) => {
  res.json({
    success: true,
    message: 'Document processing retry initiated',
    documentId: req.params.documentId,
    status: 'processing'
  });
});

// Document deletion
app.delete('/api/documents/documents/:documentId', (req, res) => {
  res.json({
    success: true,
    message: 'Document deleted successfully',
    documentId: req.params.documentId
  });
});

// Document chunk upload
app.post('/api/documents/upload/:documentId/chunk/:chunkIndex', (req, res) => {
  res.json({
    success: true,
    chunkIndex: req.params.chunkIndex,
    documentId: req.params.documentId,
    status: 'uploaded'
  });
});

// Document upload status
app.get('/api/documents/upload/:documentId/status', (req, res) => {
  // Mock upload status - randomly complete or in progress
  const isComplete = Math.random() > 0.3;
  
  res.json({
    success: true,
    documentId: req.params.documentId,
    status: isComplete ? 'completed' : 'processing',
    progress: isComplete ? 100 : Math.floor(Math.random() * 90) + 10,
    message: isComplete ? 'Upload and processing completed' : 'Processing document...'
  });
});

// Middleware to attach Prisma to request object
app.use((req, res, next) => {
  req.prisma = prisma;
  req.startTime = Date.now();
  next();
});

// Import and use route modules
// Load auth routes - Always load them, they'll use req.prisma
try {
  const authRouter = await import('./routes/auth.js');
  app.use('/api/auth', authRouter.default);
  console.log('🔐 Auth routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load auth routes:', error.message);
}

// Load AI routes
try {
  const aiRouter = await import('./routes/ai.js');
  app.use('/api/ai', aiRouter.default);
  console.log('🤖 AI routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load AI routes:', error.message);
}

// Force load uploads router
try {
  const uploadsRouter = await import('./routes/uploads.js');
  app.use('/api/uploads', uploadsRouter.default);
  console.log('📁 Uploads routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load uploads routes:', error.message);
}

// Load processing routes
try {
  const processingRouter = await import('./routes/processing.js');
  app.use('/api/processing', processingRouter.default);
  console.log('⚙️  Processing routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load processing routes:', error.message);
}

if (prisma) {
  try {
    const documentsRouter = await import('./routes/documents.js');
    app.use('/api/documents', documentsRouter.default);
    console.log('📁 Advanced document routes loaded');
  } catch (error) {
    console.warn('⚠️ Could not load advanced document routes:', error.message);
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 50 // Maximum 50 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];
    
    // Check filename extension for files detected as octet-stream
    const isValidByExtension = (filename, mimetype) => {
      if (mimetype === 'application/octet-stream') {
        const ext = filename.toLowerCase().split('.').pop();
        return ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      }
      return false;
    };
    
    if (allowedTypes.includes(file.mimetype) || isValidByExtension(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported for file ${file.originalname}`), false);
    }
  }
});

// Multiple document upload endpoint (for simple upload)
app.post('/api/documents/contracts/:contractId/upload/multiple', 
  upload.fields([{ name: 'documents', maxCount: 50 }]), 
  async (req, res) => {
    const { contractId } = req.params;
    const files = req.files?.documents || [];
    
    console.log(`📁 Document upload initiated for contract: ${contractId}`);
    console.log(`📄 Files received: ${files.length}`);
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    try {
      // Process each uploaded file and save to database
      const results = [];
      
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        console.log(`   📄 File ${index + 1}: ${file.originalname} (${file.size} bytes)`);
        
        // Generate unique document ID and file path
        const documentId = `doc_${Date.now()}_${index}`;
        const fileName = `${documentId}_${file.originalname}`;
        
        // Save file to disk
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, file.buffer);
        console.log(`   💾 Saved file to disk: ${filePath}`);

        // Save document metadata to database with Prisma
        let document;
        if (prisma) {
          try {
            // Check if contractId is temporary (starts with 'temp-')
            const isTempContract = contractId && contractId.startsWith('temp-');

            // Use raw SQL to save with both contractId and tempContractId
            // (Prisma client doesn't recognize tempContractId field yet)
            await prisma.$executeRaw`
              INSERT INTO uploaded_files (
                id, "contractId", "tempContractId", "fileName", "originalName",
                "fileSize", "fileType", status, "uploadDate", "filePath", progress
              ) VALUES (
                ${documentId},
                ${isTempContract ? null : contractId},
                ${isTempContract ? contractId : null},
                ${fileName},
                ${file.originalname},
                ${file.size},
                ${file.mimetype},
                'UPLOADED',
                ${new Date()},
                ${filePath},
                100
              )
            `;

            console.log(`   💾 Saved to database with ${isTempContract ? 'tempContractId' : 'contractId'}: ${contractId}`);

            // Read it back to get the full document object
            document = await prisma.$queryRaw`
              SELECT * FROM uploaded_files WHERE id = ${documentId}
            `.then(rows => rows[0]);
            console.log(`   💾 Saved metadata to database: ${document.id}`);
          } catch (dbError) {
            console.error(`   ❌ Database save failed: ${dbError.message}`);
            // Fallback to memory storage
            document = {
              id: documentId,
              contractId: contractId,
              fileName: fileName,
              originalName: file.originalname,
              fileSize: file.size,
              fileType: file.mimetype,
              status: 'UPLOADED',
              uploadDate: new Date(),
              filePath: filePath,
              progress: 100,
              url: `/api/documents/documents/${documentId}/content`
            };
            
            // Store in memory as backup
            if (!global.uploadedDocuments) {
              global.uploadedDocuments = {};
            }
            if (!global.uploadedDocuments[contractId]) {
              global.uploadedDocuments[contractId] = [];
            }
            global.uploadedDocuments[contractId].push(document);
          }
        } else {
          // No database, use memory storage
          document = {
            id: documentId,
            contractId: contractId,
            fileName: fileName,
            originalName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            status: 'UPLOADED',
            uploadDate: new Date(),
            filePath: filePath,
            progress: 100,
            url: `/api/documents/documents/${documentId}/content`
          };
          
          if (!global.uploadedDocuments) {
            global.uploadedDocuments = {};
          }
          if (!global.uploadedDocuments[contractId]) {
            global.uploadedDocuments[contractId] = [];
          }
          global.uploadedDocuments[contractId].push(document);
        }
        
        results.push({
          id: document.id,
          url: document.url || `/api/documents/documents/${document.id}/content`,
          filename: document.originalName || document.fileName,
          size: document.fileSize,
          status: document.status,
          processingStatus: 'COMPLETED',
          documentType: 'PRIMARY'
        });
      }
      
      console.log(`✅ Saved ${results.length} documents for contract ${contractId}`);
      
      res.json({
        success: true,
        message: `${files.length} document(s) uploaded successfully`,
        results: results
      });
      
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process uploaded documents'
      });
    }
  }
);

// Document analysis endpoint - analyze existing documents with AI
app.post('/api/documents/analyze/:contractId', async (req, res) => {
  // IMMEDIATE DEBUG LOG - First thing that executes
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚨 ANALYZE ENDPOINT CALLED! Contract ID: ${req.params.contractId}`);
  console.log(`🔍 Query params:`, req.query);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const { contractId } = req.params;
    const aiProvider = req.query.aiProvider || 'bedrock'; // Get AI provider from query param
    const clearCache = req.query.clearCache === 'true'; // Check if we should clear cache

    console.log(`🔍 Starting AI analysis for contract: ${contractId}`);
    console.log(`🤖 Using AI provider: ${aiProvider}`);
    if (clearCache) {
      console.log(`🗑️  Clear cache requested - removing old analysis data`);
    }

    // Get Socket.IO instance for progress updates
    const io = req.app.get('io');
    const jobId = req.query.jobId || `analysis-${Date.now()}`;

    // Clear cache if requested (new session)
    if (clearCache && global.uploadedDocuments?.[contractId]) {
      console.log(`🗑️  Clearing cached analysis for contract: ${contractId}`);
      // Remove extracted analysis data from cached documents but keep the documents
      global.uploadedDocuments[contractId] = global.uploadedDocuments[contractId].map(doc => ({
        ...doc,
        extractedData: {
          ...doc.extractedData,
          analysis: undefined // Clear previous analysis
        }
      }));
    }

    // Check in-memory store first (for recently uploaded documents)
    console.log(`🔍 DEBUG: Checking in-memory documents for contractId: ${contractId}`);
    const memoryDocuments = global.uploadedDocuments?.[contractId] || [];
    console.log(`📦 DEBUG: Found ${memoryDocuments.length} documents in memory`);

    // If we have Prisma, also check the database
    let dbDocuments = [];
    console.log(`🗄️  DEBUG: Prisma available: ${!!prisma}`);
    if (prisma) {
      try {
        // Use raw SQL to query both contractId and tempContractId fields
        // (Prisma client not regenerated yet to recognize tempContractId)
        console.log(`🔍 Querying documents for analysis - contractId: ${contractId}`);
        dbDocuments = await prisma.$queryRaw`
          SELECT * FROM uploaded_files
          WHERE "contractId" = ${contractId} OR "tempContractId" = ${contractId}
          ORDER BY "uploadDate" DESC
        `;
        console.log(`📄 Found ${dbDocuments.length} documents in database for analysis`);
      } catch (dbError) {
        console.error('❌ Database query failed:', dbError.message);
        console.error(dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve documents from database'
        });
      }
    }

    // Combine and deduplicate documents (memory takes precedence)
    const allDocuments = [...memoryDocuments];
    const memoryIds = new Set(memoryDocuments.map(doc => doc.id));
    dbDocuments.forEach(doc => {
      if (!memoryIds.has(doc.id)) {
        allDocuments.push(doc);
      }
    });

    const documents = allDocuments;

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No documents found for analysis'
      });
    }

    console.log(`📄 Found ${documents.length} documents to analyze`);

    // Perform real AI-powered business rules extraction
    const analysisResults = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      // Normalize filename field (database uses originalName, not originalFilename)
      const filename = doc.originalName || doc.fileName || 'Unknown Document';

      console.log(`🤖 Analyzing: ${filename}`);

      // Emit progress update via Socket.IO
      if (io) {
        const progress = Math.round((i / documents.length) * 100);
        io.emit('processing:progress', {
          jobId,
          status: 'processing',
          overallProgress: progress,
          currentDocIndex: i,
          documents: documents.map((d, idx) => ({
            filename: d.originalName || d.fileName || 'Unknown',
            status: idx < i ? 'completed' : idx === i ? 'processing' : 'queued',
            progress: idx < i ? 100 : idx === i ? 50 : 0,
            chunksTotal: 1,
            currentChunk: idx === i ? 1 : 0,
            chunksProcessed: idx < i ? 1 : 0
          })),
          startTime: Date.now()
        });
        console.log(`📡 Emitted progress: ${progress}% for ${filename} (document ${i + 1}/${documents.length})`);
      }

      const startTime = Date.now();

      try {
        // Extract document content for analysis
        let documentContent = '';

        // Get content from extracted data if available
        if (doc.extractedData?.content?.text) {
          documentContent = doc.extractedData.content.text;
        } else if (doc.content) {
          // Fallback to direct content if available
          documentContent = typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content);
        } else {
          // Use filename and any available metadata as context
          documentContent = `Document: ${filename}\nFile type: ${doc.fileType || 'unknown'}\nSize: ${doc.fileSize || 'unknown'}`;
          console.warn(`⚠️ Limited content available for ${filename}, using metadata`);
        }

        // For large documents (> 50K chars), extract key sections to reduce token usage
        // This helps avoid rate limits and focuses AI on relevant contract parameters
        const processedContent = documentChunker.createParameterExtractionText(
          documentContent,
          filename
        );

        console.log(`📝 Processing ${filename}: ${documentContent.length} chars → ${processedContent.length} chars for AI`);

        // Use AI service to extract business rules from document content
        // CRITICAL: Pass BOTH processed content (for AI) AND full content (for regex fallback)
        const aiAnalysis = await aiService.extractBusinessRules(processedContent, {
          filename: filename,
          contractType: doc.contractType || 'unknown',
          documentId: doc.id,
          originalLength: documentContent.length,
          _fullDocumentContent: documentContent,  // Full text for regex fallback extraction
          aiProvider: aiProvider  // Pass the selected AI provider
        });

        const processingTime = Date.now() - startTime;

        // Transform AI analysis to match expected format
        const analysis = {
          documentId: doc.id,
          filename: filename,
          contractType: aiAnalysis.documentSummary.contractType,
          parties: aiAnalysis.documentSummary.parties,
          keyTerms: aiAnalysis.documentSummary.keyTerms,
          extractedData: aiAnalysis.extractedData,
          extractedRules: aiAnalysis.extractedRules,
          riskFactors: aiAnalysis.riskFactors,
          anomalies: aiAnalysis.anomalies,
          confidence: aiAnalysis.summary.confidenceScore,
          processingTime: processingTime,
          analysisDate: new Date().toISOString(),
          summary: aiAnalysis.summary,
          structuredExtraction: aiAnalysis.structuredExtraction  // Include structured extraction metadata
        };

        analysisResults.push(analysis);

        console.log(`✅ AI analysis complete for ${filename} (${analysis.extractedRules.length} rules extracted, confidence: ${analysis.confidence})`);
        if (analysis.structuredExtraction) {
          console.log(`   🔍 Structured Extraction: ${analysis.structuredExtraction.documentType} (${Math.round(analysis.structuredExtraction.confidence * 100)}%)`);
        }

      } catch (analysisError) {
        console.error(`❌ AI analysis failed for ${filename}:`, analysisError.message);

        // Create fallback analysis result
        const fallbackAnalysis = {
          documentId: doc.id,
          filename: filename,
          contractType: 'Analysis Failed',
          parties: ['Unknown'],
          keyTerms: [],
          extractedData: {},
          extractedRules: [],
          riskFactors: ['Analysis failed - manual review required'],
          anomalies: [{
            type: 'analysis_error',
            description: `Failed to analyze document: ${analysisError.message}`,
            impact: 'Document requires manual processing',
            recommendation: 'Review document format and content'
          }],
          confidence: 0.0,
          processingTime: Date.now() - startTime,
          analysisDate: new Date().toISOString(),
          summary: {
            totalRulesExtracted: 0,
            confidenceScore: 0.0,
            processingNotes: `Analysis failed: ${analysisError.message}`
          },
          error: analysisError.message
        };

        analysisResults.push(fallbackAnalysis);
      }

      // Update document status AND save analysis results in database
      if (prisma) {
        try {
          // Get the analysis for this document from analysisResults
          const documentAnalysis = analysisResults[analysisResults.length - 1]; // Last added analysis

          await prisma.uploadedFile.update({
            where: { id: doc.id },
            data: {
              status: 'COMPLETED',  // Use valid enum value
              extractedData: {
                ...doc.extractedData, // Preserve existing extracted data
                analysis: documentAnalysis // Add analysis with business rules
              }
            }
          });

          console.log(`💾 Saved analysis for ${filename} (${documentAnalysis.extractedRules.length} rules)`);
        } catch (updateError) {
          console.warn(`Failed to update document ${doc.id}:`, updateError.message);
        }
      } else {
        // For in-memory storage, also save the analysis
        try {
          if (global.uploadedDocuments && global.uploadedDocuments[doc.contractId || 'temp']) {
            const docs = global.uploadedDocuments[doc.contractId || 'temp'];
            const docIndex = docs.findIndex(d => d.id === doc.id);
            if (docIndex >= 0) {
              const documentAnalysis = analysisResults[analysisResults.length - 1];
              docs[docIndex].extractedData = {
                ...docs[docIndex].extractedData,
                analysis: documentAnalysis
              };
              console.log(`💾 Saved analysis to in-memory storage for ${filename} (${documentAnalysis.extractedRules.length} rules)`);
            }
          }
        } catch (memoryError) {
          console.warn(`Failed to save analysis to memory for ${doc.id}:`, memoryError.message);
        }
      }
    }
    
    console.log(`✅ Analysis complete for ${analysisResults.length} documents`);
    
    const blueprint = buildContractBlueprint(analysisResults);
    const contractNarrative = buildContractNarrative(blueprint.formData);

    // Calculate comprehensive summary statistics
    const totalRules = analysisResults.reduce((sum, r) => sum + (r.extractedRules?.length || 0), 0);
    const rulesByCategory = {};
    const allAnomalies = analysisResults.flatMap(r => r.anomalies || []);
    const allRiskFactors = analysisResults.flatMap(r => r.riskFactors || []);

    // Aggregate enhanced structured data
    const allPaymentRules = analysisResults.flatMap(r => r.paymentRules || []);
    const allPerformanceGuarantees = analysisResults.flatMap(r => r.performanceGuarantees || []);
    const allOperationalRequirements = analysisResults.flatMap(r => r.operationalRequirements || []);
    const allTerminationClauses = analysisResults.flatMap(r => r.terminationClauses || []);
    const allComplianceRequirements = analysisResults.flatMap(r => r.complianceRequirements || []);
    const allMilestones = analysisResults.flatMap(r => r.keyMilestones || []);
    const allStakeholders = analysisResults.flatMap(r => r.stakeholders || []);

    // Categorize extracted rules
    const rulesByPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    analysisResults.forEach(result => {
      if (result.extractedRules) {
        result.extractedRules.forEach(rule => {
          const category = rule.category || 'general';
          rulesByCategory[category] = (rulesByCategory[category] || 0) + 1;

          // Count by priority
          const priority = rule.priority || 'medium';
          if (rulesByPriority.hasOwnProperty(priority)) {
            rulesByPriority[priority]++;
          }
        });
      }
    });

    // Calculate financial summary from blueprint
    const financialSummary = {
      totalContractValue: blueprint.formData.ratedCapacity && blueprint.formData.baseRate && blueprint.formData.contractTerm
        ? blueprint.formData.ratedCapacity * blueprint.formData.baseRate * 12 * 24 * 365 * blueprint.formData.contractTerm / 1000
        : null,
      annualCost: blueprint.formData.ratedCapacity && blueprint.formData.baseRate
        ? blueprint.formData.ratedCapacity * blueprint.formData.baseRate * 12 * 24 * 365 / 1000
        : null,
      escalatedTotalValue: null, // TODO: Calculate with escalation
      paymentFrequency: blueprint.formData.invoiceFrequency || 'monthly',
      estimatedRevenue: null
    };

    console.log(`📊 Enhanced extraction summary:`);
    console.log(`   💰 Payment Rules: ${allPaymentRules.length}`);
    console.log(`   🎯 Performance Guarantees: ${allPerformanceGuarantees.length}`);
    console.log(`   ⚙️  Operational Requirements: ${allOperationalRequirements.length}`);
    console.log(`   📋 Compliance Requirements: ${allComplianceRequirements.length}`);
    console.log(`   🛑 Termination Clauses: ${allTerminationClauses.length}`);
    console.log(`   📅 Milestones: ${allMilestones.length}`);
    console.log(`   👥 Stakeholders: ${allStakeholders.length}`);

    // Emit completion event via Socket.IO
    if (io) {
      io.emit('processing:progress', {
        jobId,
        status: 'completed',
        overallProgress: 100,
        currentDocIndex: documents.length,
        documents: documents.map(d => ({
          filename: d.originalName || d.originalFilename || d.fileName || 'Unknown',
          status: 'completed',
          progress: 100,
          chunksTotal: 1,
          currentChunk: 1,
          chunksProcessed: 1
        })),
        results: analysisResults,
        blueprint: blueprint,
        contractSummaryNarrative: contractNarrative,
        startTime: Date.now()
      });
      console.log(`📡 Emitted completion event for job ${jobId} with ${analysisResults.length} results and blueprint`);
    }

    console.log(`📤 Sending response with ${analysisResults.length} results`);
    console.log(`📋 First result structure:`, analysisResults[0] ? Object.keys(analysisResults[0]) : 'NO RESULTS');

    res.json({
      success: true,
      contractId: contractId,
      documentsAnalyzed: analysisResults.length,
      results: analysisResults,
      contractBlueprint: blueprint,
      contractSummaryNarrative: contractNarrative,
      summary: {
        totalDocuments: documents.length,
        totalRulesExtracted: totalRules,
        contractTypes: [...new Set(analysisResults.map(r => r.contractType))],
        parties: [...new Set(analysisResults.flatMap(r => r.parties))],
        averageConfidence: analysisResults.length > 0 ?
          Math.round((analysisResults.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.length) * 100) / 100 : 0,
        rulesByCategory: rulesByCategory,
        rulesByPriority: rulesByPriority,
        totalAnomalies: allAnomalies.length,
        totalRiskFactors: allRiskFactors.length,
        totalPaymentRules: allPaymentRules.length,
        totalPerformanceGuarantees: allPerformanceGuarantees.length,
        totalOperationalRequirements: allOperationalRequirements.length,
        totalTerminationClauses: allTerminationClauses.length,
        totalComplianceRequirements: allComplianceRequirements.length,
        totalMilestones: allMilestones.length,
        totalStakeholders: allStakeholders.length,
        analysisDate: new Date().toISOString(),
        processingStats: {
          averageProcessingTime: analysisResults.length > 0 ?
            Math.round(analysisResults.reduce((sum, r) => sum + r.processingTime, 0) / analysisResults.length) : 0,
          successfulAnalyses: analysisResults.filter(r => !r.error).length,
          failedAnalyses: analysisResults.filter(r => r.error).length
        }
      },
      financialSummary: financialSummary,
      allPaymentRules: allPaymentRules,
      allPerformanceGuarantees: allPerformanceGuarantees,
      allOperationalRequirements: allOperationalRequirements,
      allTerminationClauses: allTerminationClauses,
      allComplianceRequirements: allComplianceRequirements,
      allRiskFactors: allRiskFactors,
      allMilestones: allMilestones,
      allStakeholders: allStakeholders
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze documents',
      message: error.message
    });
  }
});

/**
 * POST /api/contracts/from-blueprint
 * Create and save a contract from analysis blueprint
 */
app.post('/api/contracts/from-blueprint', async (req, res) => {
  try {
    const { blueprint, contractId, analysisResults } = req.body;

    if (!blueprint || !blueprint.formData) {
      return res.status(400).json({
        success: false,
        error: 'Missing blueprint data'
      });
    }

    console.log(`📋 Creating contract from blueprint for contract ID: ${contractId}`);

    // Generate UUID inline for ES modules
    const newContractId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // Map blueprint formData to contract structure
    const formData = blueprint.formData;

    // Calculate total value
    const totalValue = formData.ratedCapacity * formData.baseRate * 12 * formData.contractTerm;

    // Gather all extracted rules from analysis results
    const allExtractedRules = [];
    if (analysisResults && Array.isArray(analysisResults)) {
      analysisResults.forEach(result => {
        if (result.extractedRules && Array.isArray(result.extractedRules)) {
          allExtractedRules.push(...result.extractedRules);
        }
      });
    }

    // Create contract object
    const contract = {
      id: newContractId,
      name: `${formData.customerName} - ${formData.solutionType}`,
      client: formData.customerName,
      site: formData.siteLocation,
      capacity: formData.ratedCapacity,
      term: formData.contractTerm,
      systemType: formData.solutionType,
      effectiveDate: formData.effectiveDate,
      status: 'DRAFT',
      totalValue: totalValue,
      yearlyRate: formData.baseRate * 12,
      notes: `Contract generated from ${analysisResults?.length || 0} uploaded documents. ${formData.specialRequirements || ''}`,
      tags: ['AI Generated', 'Multi-Document'],
      isAiGenerated: true,
      aiConfidence: analysisResults?.length > 0 ?
        Math.round((analysisResults.reduce((sum, r) => sum + (r.confidence || 0.8), 0) / analysisResults.length) * 100) / 100 : 0.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Embedded parameters
      financialParams: {
        baseRate: formData.baseRate,
        microgridAdder: formData.microgridAdder || 0,
        escalation: formData.annualEscalation,
        thermalCycleFee: formData.thermalCycleFee || 0,
        electricalBudget: formData.electricalBudget || 0,
        commissioningAllowance: formData.commissioningAllowance || 0
      },

      technicalParams: {
        voltage: formData.gridParallelVoltage,
        servers: formData.numberOfServers,
        components: formData.selectedComponents,
        recType: formData.includeRECs ? formData.recType : null,
        installationType: formData.installationType,
        reliabilityLevel: formData.reliabilityLevel
      },

      operatingParams: {
        outputWarranty: formData.outputWarrantyPercent,
        efficiency: formData.efficiencyWarrantyPercent,
        minDemand: formData.minDemandKW,
        maxDemand: formData.maxDemandKW,
        criticalOutput: formData.guaranteedCriticalOutput
      },

      // Extracted rules from all documents
      extractedRules: allExtractedRules,
      rulesBySection: blueprint.rulesBySection,

      // Blueprint metadata
      blueprintMetadata: {
        sourceContractId: contractId,
        sourceDocuments: blueprint.metadata?.documents || [],
        parties: blueprint.metadata?.parties || [],
        contractType: blueprint.metadata?.contractType || '',
        extractionDate: new Date().toISOString(),
        extractionMethod: 'multi_document_analysis',
        version: '1.0'
      }
    };

    // If Prisma is available, save to database
    if (prisma) {
      try {
        const dbContract = await prisma.contract.create({
          data: {
            name: contract.name,
            client: contract.client,
            site: contract.site,
            capacity: contract.capacity,
            term: contract.term,
            systemType: contract.systemType,
            effectiveDate: contract.effectiveDate,
            status: contract.status,
            totalValue: contract.totalValue,
            yearlyRate: contract.yearlyRate,
            notes: contract.notes,
            tags: contract.tags,
            isAiGenerated: contract.isAiGenerated,
            aiConfidence: contract.aiConfidence
          }
        });

        console.log(`✅ Contract ${dbContract.id} saved to database`);

        return res.status(201).json({
          success: true,
          contract: dbContract,
          message: 'Contract created and saved to database',
          extractedRulesCount: allExtractedRules.length
        });
      } catch (dbError) {
        console.error('Database save failed, falling back to in-memory:', dbError);
      }
    }

    // In-memory storage (if Prisma not available or failed)
    if (!global.contracts) {
      global.contracts = [];
    }

    global.contracts.push(contract);

    console.log(`✅ Contract ${contract.id} saved to in-memory storage (total: ${global.contracts.length})`);
    console.log(`📊 Extracted ${allExtractedRules.length} rules from ${analysisResults?.length || 0} documents`);

    res.status(201).json({
      success: true,
      contract: contract,
      message: 'Contract created from multi-document analysis (in-memory mode)',
      inMemory: true,
      extractedRulesCount: allExtractedRules.length,
      documentsAnalyzed: analysisResults?.length || 0
    });

  } catch (error) {
    console.error('Failed to create contract from blueprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contract from blueprint',
      message: error.message
    });
  }
});

// ============================================================================
// MULTI-DOCUMENT PROCESSING API
// ============================================================================

// Global multi-document processor instance
let multiDocProcessor = null;

/**
 * Setup function to initialize multi-document processor with Socket.io
 * Called from server.js after Socket.io is initialized
 */
export function setupMultiDocumentProcessor(io) {
  multiDocProcessor = new MultiDocumentProcessor(aiService, documentChunker);

  // Listen for progress events and broadcast to connected clients
  multiDocProcessor.on('progress', (status) => {
    console.log(`📡 Broadcasting progress: ${status.jobId} - ${status.status} (${status.overallProgress}%) - Results: ${status.results ? 'YES' : 'NO'}`);
    io.emit('processing:progress', status);
  });

  console.log('✅ Multi-document processor initialized with WebSocket support');

  // Cleanup old jobs every hour
  setInterval(() => {
    multiDocProcessor.cleanup();
  }, 3600000);
}

/**
 * POST /api/processing/start
 * Start multi-document processing job
 */
app.post('/api/processing/start', async (req, res) => {
  try {
    if (!multiDocProcessor) {
      return res.status(503).json({
        success: false,
        error: 'Multi-document processor not initialized'
      });
    }

    const { contractId, documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required'
      });
    }

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Starting multi-document processing job`);
    console.log(`📋 Job ID: ${jobId}`);
    console.log(`📚 Documents: ${documents.length}`);
    console.log(`📝 Contract ID: ${contractId || 'N/A'}`);
    console.log(`${'='.repeat(80)}\n`);

    // Start processing (async - continues in background)
    await multiDocProcessor.startProcessing(jobId, documents, {
      contractId,
      analysisType: 'contract_extraction'
    });

    res.json({
      success: true,
      jobId,
      message: `Processing ${documents.length} documents in background`,
      documentsQueued: documents.length
    });

  } catch (error) {
    console.error('Failed to start multi-document processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start processing',
      message: error.message
    });
  }
});

/**
 * GET /api/processing/status/:jobId
 * Get processing job status
 */
app.get('/api/processing/status/:jobId', (req, res) => {
  try {
    if (!multiDocProcessor) {
      return res.status(503).json({
        success: false,
        error: 'Multi-document processor not initialized'
      });
    }

    const { jobId } = req.params;
    const status = multiDocProcessor.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Failed to get job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

/**
 * POST /api/processing/pause/:jobId
 * Pause processing job
 */
app.post('/api/processing/pause/:jobId', (req, res) => {
  try {
    if (!multiDocProcessor) {
      return res.status(503).json({
        success: false,
        error: 'Multi-document processor not initialized'
      });
    }

    const { jobId } = req.params;
    multiDocProcessor.pauseJob(jobId);

    res.json({
      success: true,
      message: 'Job paused'
    });

  } catch (error) {
    console.error('Failed to pause job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause job',
      message: error.message
    });
  }
});

/**
 * POST /api/processing/resume/:jobId
 * Resume processing job
 */
app.post('/api/processing/resume/:jobId', async (req, res) => {
  try {
    if (!multiDocProcessor) {
      return res.status(503).json({
        success: false,
        error: 'Multi-document processor not initialized'
      });
    }

    const { jobId } = req.params;
    await multiDocProcessor.resumeJob(jobId);

    res.json({
      success: true,
      message: 'Job resumed'
    });

  } catch (error) {
    console.error('Failed to resume job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume job',
      message: error.message
    });
  }
});

/**
 * POST /api/processing/cancel/:jobId
 * Cancel processing job
 */
app.post('/api/processing/cancel/:jobId', (req, res) => {
  try {
    if (!multiDocProcessor) {
      return res.status(503).json({
        success: false,
        error: 'Multi-document processor not initialized'
      });
    }

    const { jobId } = req.params;
    multiDocProcessor.cancelJob(jobId);

    res.json({
      success: true,
      message: 'Job cancelled'
    });

  } catch (error) {
    console.error('Failed to cancel job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export default app;
