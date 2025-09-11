/**
 * Integration Tests for Contract API Routes
 */

import request from 'supertest';
import express from 'express';
import contractRoutes from '../contracts.js';
import { 
  mockPrisma, 
  createMockRequest, 
  createMockResponse, 
  createMockContract,
  createMockUser
} from '../../test/setup.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.prisma = mockPrisma;
  req.user = createMockUser();
  next();
});
app.use('/api/contracts', contractRoutes);

describe('Contract API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/contracts', () => {
    it('should return all contracts', async () => {
      const mockContracts = [
        createMockContract({ id: '1', name: 'Contract 1' }),
        createMockContract({ id: '2', name: 'Contract 2' })
      ];

      mockPrisma.contract.findMany.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get('/api/contracts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contracts).toHaveLength(2);
      expect(response.body.contracts[0].name).toBe('Contract 1');
    });

    it('should handle database errors', async () => {
      mockPrisma.contract.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/contracts')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should filter contracts by status', async () => {
      const activeContracts = [
        createMockContract({ id: '1', status: 'ACTIVE' })
      ];

      mockPrisma.contract.findMany.mockResolvedValue(activeContracts);

      const response = await request(app)
        .get('/api/contracts?status=ACTIVE')
        .expect(200);

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'ACTIVE' }),
        include: expect.any(Object)
      });
      expect(response.body.contracts).toHaveLength(1);
    });
  });

  describe('GET /api/contracts/:id', () => {
    it('should return a specific contract', async () => {
      const mockContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);

      const response = await request(app)
        .get('/api/contracts/test-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contract.id).toBe('test-id');
      expect(mockPrisma.contract.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: expect.any(Object)
      });
    });

    it('should return 404 for non-existent contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/contracts/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('POST /api/contracts', () => {
    it('should create a new contract', async () => {
      const newContractData = {
        name: 'New Contract',
        client: 'Test Client',
        capacity: 1000,
        term: 15,
        financial: {
          baseRate: 0.085,
          escalation: 3.2
        },
        technical: {
          voltage: 'V_13_2K'
        },
        operating: {
          outputWarranty: 92
        }
      };

      const createdContract = createMockContract(newContractData);
      mockPrisma.contract.create.mockResolvedValue(createdContract);

      const response = await request(app)
        .post('/api/contracts')
        .send(newContractData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.contract.name).toBe('New Contract');
      expect(mockPrisma.contract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Contract',
          client: 'Test Client'
        })
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        client: ''
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });

    it('should handle Prisma unique constraint errors', async () => {
      const newContractData = {
        name: 'Duplicate Contract',
        client: 'Test Client'
      };

      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['name'] };
      
      mockPrisma.contract.create.mockRejectedValue(prismaError);

      const response = await request(app)
        .post('/api/contracts')
        .send(newContractData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('PUT /api/contracts/:id', () => {
    it('should update an existing contract', async () => {
      const updateData = {
        name: 'Updated Contract',
        capacity: 2000
      };

      const existingContract = createMockContract({ id: 'test-id' });
      const updatedContract = { ...existingContract, ...updateData };

      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);
      mockPrisma.contract.update.mockResolvedValue(updatedContract);

      const response = await request(app)
        .put('/api/contracts/test-id')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contract.name).toBe('Updated Contract');
      expect(response.body.contract.capacity).toBe(2000);
      expect(mockPrisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining(updateData)
      });
    });

    it('should return 404 for non-existent contract update', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/contracts/non-existent')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(mockPrisma.contract.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/contracts/:id', () => {
    it('should delete an existing contract', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);
      mockPrisma.contract.delete.mockResolvedValue(existingContract);

      const response = await request(app)
        .delete('/api/contracts/test-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockPrisma.contract.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('should return 404 for non-existent contract deletion', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/contracts/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(mockPrisma.contract.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/contracts/search', () => {
    it('should search contracts by query', async () => {
      const searchResults = [
        createMockContract({ name: 'Matching Contract', client: 'Search Client' })
      ];

      mockPrisma.contract.findMany.mockResolvedValue(searchResults);
      mockPrisma.contract.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/contracts/search?query=matching&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contracts).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array)
          }),
          skip: 0,
          take: 10
        })
      );
    });

    it('should handle empty search results', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);
      mockPrisma.contract.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/contracts/search?query=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contracts).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should filter by multiple criteria', async () => {
      const response = await request(app)
        .get('/api/contracts/search?status=ACTIVE&client=Test&minCapacity=500&maxCapacity=2000')
        .expect(200);

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            client: expect.objectContaining({
              contains: 'Test'
            }),
            capacity: expect.objectContaining({
              gte: 500,
              lte: 2000
            })
          })
        })
      );
    });
  });

  describe('POST /api/contracts/calculate', () => {
    it('should calculate contract financials', async () => {
      const financialData = {
        capacity: 1000,
        baseRate: 0.085,
        escalation: 3.2,
        term: 15
      };

      const response = await request(app)
        .post('/api/contracts/calculate')
        .send(financialData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.calculations).toBeDefined();
      expect(response.body.calculations.netPresentValue).toBeGreaterThan(0);
      expect(response.body.calculations.totalContractValue).toBeGreaterThan(0);
      expect(response.body.calculations.yearlyBreakdown).toHaveLength(15);
    });

    it('should validate financial calculation parameters', async () => {
      const invalidData = {
        capacity: -100, // Negative capacity
        baseRate: 2.0,  // Rate > 1
        escalation: -5, // Negative escalation
        term: 0         // Zero term
      };

      const response = await request(app)
        .post('/api/contracts/calculate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('validation');
    });
  });

  describe('POST /api/contracts/validate', () => {
    it('should validate a complete contract', async () => {
      const contractData = createMockContract();

      const response = await request(app)
        .post('/api/contracts/validate')
        .send(contractData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(true);
      expect(response.body.validation.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid contract', async () => {
      const invalidContract = {
        name: '',
        capacity: -100,
        term: 0,
        financial: {
          baseRate: 2.0 // Invalid rate > 1
        }
      };

      const response = await request(app)
        .post('/api/contracts/validate')
        .send(invalidContract)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.valid).toBe(false);
      expect(response.body.validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/contracts/:id/export', () => {
    it('should export contract as PDF', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);

      const response = await request(app)
        .get('/api/contracts/test-id/export?format=pdf')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export contract as JSON', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);

      const response = await request(app)
        .get('/api/contracts/test-id/export?format=json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contract.id).toBe('test-id');
    });

    it('should return 404 for non-existent contract export', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/contracts/non-existent/export')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/contracts/:id/upload', () => {
    it('should upload file to contract', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      const uploadRecord = {
        id: 'upload-123',
        filename: 'test.pdf',
        size: 1024,
        uploadDate: new Date()
      };

      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);
      mockPrisma.uploadedFile.create.mockResolvedValue(uploadRecord);

      const response = await request(app)
        .post('/api/contracts/test-id/upload')
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.upload.filename).toBe('test.pdf');
      expect(mockPrisma.uploadedFile.create).toHaveBeenCalled();
    });

    it('should reject files that are too large', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);

      // Create a buffer larger than the limit (assuming 10MB limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/contracts/test-id/upload')
        .attach('file', largeBuffer, 'large.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('too large');
    });

    it('should reject unsupported file types', async () => {
      const existingContract = createMockContract({ id: 'test-id' });
      mockPrisma.contract.findUnique.mockResolvedValue(existingContract);

      const response = await request(app)
        .post('/api/contracts/test-id/upload')
        .attach('file', Buffer.from('executable content'), 'malware.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('file type');
    });
  });
});