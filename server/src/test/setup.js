/**
 * Backend Test Setup
 * Configuration for Node.js API testing
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock Prisma Client for tests
export const mockPrisma = {
  contract: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  uploadedFile: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  learnedRule: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  template: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
};

// Mock external services
export const mockServices = {
  ai: {
    anthropic: {
      messages: {
        create: jest.fn(),
      },
    },
    openai: {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    },
  },
  textract: {
    analyzeDocument: jest.fn(),
  },
  notification: {
    sendToUser: jest.fn(),
    sendToRole: jest.fn(),
    broadcast: jest.fn(),
  },
};

// Test utilities
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: { id: 'test-user', role: 'user' },
  prisma: mockPrisma,
  id: 'test-request-id',
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides,
});

export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    removeHeader: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  };
  return res;
};

export const createMockNext = () => jest.fn();

export const createMockFile = (overrides = {}) => ({
  fieldname: 'file',
  originalname: 'test.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('test file content'),
  ...overrides,
});

export const createMockContract = (overrides = {}) => ({
  id: 'test-contract-1',
  name: 'Test Contract',
  client: 'Test Client',
  status: 'DRAFT',
  capacity: 1000,
  term: 15,
  financial: {
    baseRate: 0.085,
    escalation: 3.2,
  },
  technical: {
    voltage: 'V_13_2K',
  },
  operating: {
    outputWarranty: 92,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  uploads: [],
  templates: [],
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Global test hooks
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset mock implementations
  Object.values(mockPrisma).forEach(model => {
    if (typeof model === 'object') {
      Object.values(model).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockClear();
        }
      });
    }
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Suppress console output in tests unless debugging
const originalConsole = { ...console };
beforeAll(() => {
  if (process.env.DEBUG_TESTS !== 'true') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  if (process.env.DEBUG_TESTS !== 'true') {
    Object.assign(console, originalConsole);
  }
});