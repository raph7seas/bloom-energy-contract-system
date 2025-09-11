/**
 * Unit Tests for Contract Service
 */

import contractService from '../contractService';
import { createMockApiResponse, createMockContract } from '../../test/setup';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ContractService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('getContracts', () => {
    it('should fetch contracts successfully', async () => {
      const mockContracts = [
        createMockContract({ id: '1', name: 'Contract 1' }),
        createMockContract({ id: '2', name: 'Contract 2' })
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contracts: mockContracts })
      } as Response);

      const result = await contractService.getContracts();

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockContracts);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await contractService.getContracts();

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Server error' })
      } as Response);

      const result = await contractService.getContracts();

      expect(result).toEqual([]);
    });
  });

  describe('getContract', () => {
    it('should fetch a single contract successfully', async () => {
      const mockContract = createMockContract({ id: 'test-id' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contract: mockContract })
      } as Response);

      const result = await contractService.getContract('test-id');

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/test-id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockContract);
    });

    it('should return null for non-existent contract', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' })
      } as Response);

      const result = await contractService.getContract('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createContract', () => {
    it('should create a contract successfully', async () => {
      const newContract = createMockContract({ name: 'New Contract' });
      const contractData = { name: 'New Contract', client: 'Test Client' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contract: newContract })
      } as Response);

      const result = await contractService.createContract(contractData);

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });
      expect(result).toEqual(newContract);
    });

    it('should handle validation errors', async () => {
      const contractData = { name: '', client: '' }; // Invalid data
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validation failed',
          details: [
            { field: 'name', message: 'Name is required' },
            { field: 'client', message: 'Client is required' }
          ]
        })
      } as Response);

      await expect(contractService.createContract(contractData)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateContract', () => {
    it('should update a contract successfully', async () => {
      const updatedContract = createMockContract({ 
        id: 'test-id', 
        name: 'Updated Contract' 
      });
      const updateData = { name: 'Updated Contract' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contract: updatedContract })
      } as Response);

      const result = await contractService.updateContract('test-id', updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/test-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      expect(result).toEqual(updatedContract);
    });

    it('should handle update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Contract not found' })
      } as Response);

      await expect(contractService.updateContract('non-existent', {}))
        .rejects.toThrow('Contract not found');
    });
  });

  describe('deleteContract', () => {
    it('should delete a contract successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ message: 'Contract deleted' })
      } as Response);

      const result = await contractService.deleteContract('test-id');

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/test-id', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toBe(true);
    });

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Contract not found' })
      } as Response);

      const result = await contractService.deleteContract('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('searchContracts', () => {
    it('should search contracts with query parameters', async () => {
      const mockContracts = [createMockContract({ name: 'Search Result' })];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ 
          contracts: mockContracts,
          pagination: { total: 1, page: 1, limit: 10 }
        })
      } as Response);

      const result = await contractService.searchContracts({
        query: 'search term',
        status: 'ACTIVE',
        page: 1,
        limit: 10
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/contracts/search?query=search%20term&status=ACTIVE&page=1&limit=10',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      expect(result.contracts).toEqual(mockContracts);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ 
          contracts: [],
          pagination: { total: 0, page: 1, limit: 10 }
        })
      } as Response);

      const result = await contractService.searchContracts({ query: 'no results' });

      expect(result.contracts).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('calculateFinancials', () => {
    it('should calculate contract financials correctly', async () => {
      const financialData = {
        capacity: 1000,
        baseRate: 0.085,
        escalation: 3.2,
        term: 15
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({
          calculations: {
            netPresentValue: 1500000,
            totalContractValue: 2250000,
            averageAnnualPayment: 150000,
            yearlyBreakdown: []
          }
        })
      } as Response);

      const result = await contractService.calculateFinancials(financialData);

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financialData)
      });
      expect(result.netPresentValue).toBe(1500000);
      expect(result.totalContractValue).toBe(2250000);
    });

    it('should handle calculation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          success: false, 
          error: 'Invalid financial parameters' 
        })
      } as Response);

      await expect(contractService.calculateFinancials({}))
        .rejects.toThrow('Invalid financial parameters');
    });
  });

  describe('validateContract', () => {
    it('should validate contract successfully', async () => {
      const contractData = createMockContract();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({
          valid: true,
          errors: [],
          warnings: []
        })
      } as Response);

      const result = await contractService.validateContract(contractData);

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return validation errors', async () => {
      const invalidContract = createMockContract({ capacity: -100 });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({
          valid: false,
          errors: ['Capacity must be positive'],
          warnings: ['Consider minimum capacity requirements']
        })
      } as Response);

      const result = await contractService.validateContract(invalidContract);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Capacity must be positive');
      expect(result.warnings).toContain('Consider minimum capacity requirements');
    });
  });

  describe('exportContract', () => {
    it('should export contract as PDF', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers({
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="contract.pdf"'
        })
      } as Response);

      const result = await contractService.exportContract('test-id', 'pdf');

      expect(mockFetch).toHaveBeenCalledWith('/api/contracts/test-id/export?format=pdf', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should export contract as JSON', async () => {
      const contractData = createMockContract();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contract: contractData })
      } as Response);

      const result = await contractService.exportContract('test-id', 'json');

      expect(result).toEqual(contractData);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const uploadResponse = {
        id: 'upload-123',
        filename: 'test.pdf',
        size: 1024,
        uploadDate: new Date().toISOString()
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ upload: uploadResponse })
      } as Response);

      const result = await contractService.uploadFile('test-id', mockFile);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(uploadResponse);
    });

    it('should handle file upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({ success: false, error: 'File too large' })
      } as Response);

      await expect(contractService.uploadFile('test-id', mockFile))
        .rejects.toThrow('File too large');
    });
  });
});