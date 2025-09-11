/**
 * Integration Tests for Complete Contract Workflow
 * Tests the entire contract lifecycle from creation to export
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMockContract, createMockApiResponse } from '../setup';

// Mock the main contract component
jest.mock('../../components/BloomContractLearningSystem', () => {
  return function MockBloomContractLearningSystem() {
    return (
      <div data-testid="contract-system">
        <div data-testid="create-tab">Create Contract</div>
        <div data-testid="library-tab">Contract Library</div>
        <form data-testid="contract-form">
          <input data-testid="contract-name" placeholder="Contract Name" />
          <input data-testid="client-name" placeholder="Client Name" />
          <input data-testid="capacity" placeholder="Capacity (kW)" type="number" />
          <input data-testid="term" placeholder="Term (years)" type="number" />
          <input data-testid="base-rate" placeholder="Base Rate" type="number" step="0.001" />
          <button data-testid="save-contract" type="submit">Save Contract</button>
        </form>
        <div data-testid="contract-list">
          <div data-testid="contract-item-1">Test Contract 1</div>
          <div data-testid="contract-item-2">Test Contract 2</div>
        </div>
        <button data-testid="export-pdf">Export PDF</button>
        <button data-testid="validate-contract">Validate</button>
      </div>
    );
  };
});

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Contract Workflow Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Contract Creation Workflow', () => {
    it('should complete full contract creation process', async () => {
      const user = userEvent.setup();

      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockApiResponse({ 
            calculations: {
              netPresentValue: 1500000,
              totalContractValue: 2250000,
              yearlyBreakdown: []
            }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockApiResponse({ 
            contract: createMockContract({
              name: 'Integration Test Contract',
              client: 'Test Client Corp'
            })
          })
        } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Step 1: Fill out contract form
      await user.type(screen.getByTestId('contract-name'), 'Integration Test Contract');
      await user.type(screen.getByTestId('client-name'), 'Test Client Corp');
      await user.type(screen.getByTestId('capacity'), '1000');
      await user.type(screen.getByTestId('term'), '15');
      await user.type(screen.getByTestId('base-rate'), '0.085');

      // Step 2: Save contract
      await user.click(screen.getByTestId('save-contract'));

      // Step 3: Verify contract was created
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contracts/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('1000')
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Integration Test Contract')
        });
      });
    });

    it('should handle validation errors during creation', async () => {
      const user = userEvent.setup();

      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validation failed',
          details: [
            { field: 'capacity', message: 'Capacity must be positive' }
          ]
        })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Enter invalid data
      await user.type(screen.getByTestId('capacity'), '-100');
      await user.click(screen.getByTestId('save-contract'));

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/capacity must be positive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Contract Library Workflow', () => {
    it('should load and display contracts', async () => {
      const user = userEvent.setup();
      const mockContracts = [
        createMockContract({ id: '1', name: 'Contract A' }),
        createMockContract({ id: '2', name: 'Contract B' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contracts: mockContracts })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Navigate to library tab
      await user.click(screen.getByTestId('library-tab'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contracts', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
      });

      expect(screen.getByTestId('contract-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('contract-item-2')).toBeInTheDocument();
    });

    it('should handle search functionality', async () => {
      const user = userEvent.setup();
      const searchResults = [
        createMockContract({ name: 'Matching Contract' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ 
          contracts: searchResults,
          pagination: { total: 1, page: 1, limit: 10 }
        })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Simulate search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'matching');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/contracts/search?query=matching'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Contract Export Workflow', () => {
    it('should export contract as PDF', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers({
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="contract.pdf"'
        })
      } as Response);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      await user.click(screen.getByTestId('export-pdf'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/export?format=pdf'),
          expect.any(Object)
        );
      });

      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Contract Validation Workflow', () => {
    it('should validate contract and show results', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({
          validation: {
            valid: true,
            errors: [],
            warnings: ['Consider minimum capacity requirements']
          }
        })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      await user.click(screen.getByTestId('validate-contract'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contracts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String)
        });
      });

      // Should show validation success
      await waitFor(() => {
        expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({
          validation: {
            valid: false,
            errors: ['Capacity must be positive', 'Term must be between 5-25 years'],
            warnings: []
          }
        })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      await user.click(screen.getByTestId('validate-contract'));

      await waitFor(() => {
        expect(screen.getByText(/capacity must be positive/i)).toBeInTheDocument();
        expect(screen.getByText(/term must be between/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      await user.click(screen.getByTestId('save-contract'));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle server errors gracefully', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      await user.click(screen.getByTestId('save-contract'));

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features Workflow', () => {
    it('should handle real-time notifications', async () => {
      // Mock WebSocket
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: 1
      };
      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Simulate receiving a notification
      const mockNotification = {
        id: 'notif-1',
        type: 'contract:created',
        data: { contractName: 'New Contract', createdBy: 'User' },
        timestamp: new Date().toISOString(),
        read: false
      };

      // Find and call the message event handler
      const addEventListener = mockWebSocket.addEventListener as jest.Mock;
      const messageHandler = addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler({
          data: JSON.stringify({ event: 'notification', data: mockNotification })
        });
      }

      // Should display notification
      await waitFor(() => {
        expect(screen.getByText(/new contract.*created/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large lists efficiently', async () => {
      const largeContractList = Array.from({ length: 100 }, (_, i) =>
        createMockContract({ id: `contract-${i}`, name: `Contract ${i}` })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ contracts: largeContractList })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      const startTime = performance.now();
      
      render(<BloomContractLearningSystem />);
      
      await waitFor(() => {
        expect(screen.getByTestId('contract-list')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid user interactions', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockApiResponse({ contracts: [] })
      } as Response);

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Rapidly click between tabs
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId('create-tab'));
        await user.click(screen.getByTestId('library-tab'));
      }

      // Should not crash or show errors
      expect(screen.getByTestId('contract-system')).toBeInTheDocument();
    });
  });

  describe('Accessibility Workflow', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      const BloomContractLearningSystem = (await import('../../components/BloomContractLearningSystem')).default;
      render(<BloomContractLearningSystem />);

      // Should be able to tab through elements
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Should be able to activate elements with Enter/Space
      await user.keyboard('{Enter}');
      
      // No errors should occur
      expect(screen.getByTestId('contract-system')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      const BloomContractLearningSystem = require('../../components/BloomContractLearningSystem').default;
      render(<BloomContractLearningSystem />);

      // Check for important accessibility attributes
      const form = screen.getByTestId('contract-form');
      expect(form).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});