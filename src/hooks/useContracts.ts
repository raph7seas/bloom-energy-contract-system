import { useState, useEffect, useCallback, useMemo } from 'react';
import { Contract, ContractStats, FilterConfig, SearchConfig } from '../types';
import { contractService } from '../services';

/**
 * Custom hook for managing contract library
 * Handles contract list, search, filtering, and statistics
 */

export const useContracts = () => {
  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ContractStats | null>(null);
  
  // Search and filter state
  const [searchConfig, setSearchConfig] = useState<SearchConfig>({
    query: '',
    filters: {
      clients: [],
      statuses: [],
      types: [],
      dateRange: {
        start: '',
        end: ''
      }
    },
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Load contracts from service
  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const contractList = await contractService.getContracts();
      setContracts(contractList);
      
      // Load stats as well
      const contractStats = await contractService.getContractStats();
      setStats(contractStats);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search contracts
  const searchContracts = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await contractService.searchContracts(query);
      setContracts(results);
      
      // Update search config
      setSearchConfig(prev => ({
        ...prev,
        query
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete contract
  const deleteContract = useCallback(async (contractId: string) => {
    try {
      const success = await contractService.deleteContract(contractId);
      
      if (success) {
        setContracts(prev => prev.filter(contract => contract.id !== contractId));
        
        // Refresh stats
        const contractStats = await contractService.getContractStats();
        setStats(contractStats);
        
        return true;
      }
      
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract');
      return false;
    }
  }, []);

  // Update contract
  const updateContract = useCallback(async (contractId: string, updates: any) => {
    try {
      const updatedContract = await contractService.updateContract(contractId, updates);
      
      if (updatedContract) {
        setContracts(prev => prev.map(contract => 
          contract.id === contractId ? updatedContract : contract
        ));
        return updatedContract;
      }
      
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract');
      return null;
    }
  }, []);

  // Filter contracts based on current search config
  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    // Apply text search
    if (searchConfig.query.trim()) {
      const query = searchConfig.query.toLowerCase();
      filtered = filtered.filter(contract =>
        contract.name.toLowerCase().includes(query) ||
        contract.client.toLowerCase().includes(query) ||
        contract.site.toLowerCase().includes(query) ||
        contract.id.toLowerCase().includes(query) ||
        contract.type.toLowerCase().includes(query) ||
        (contract.tags && contract.tags.some(tag => 
          tag.toLowerCase().includes(query)
        ))
      );
    }

    // Apply status filter
    if (searchConfig.filters.statuses.length > 0) {
      filtered = filtered.filter(contract => 
        searchConfig.filters.statuses.includes(contract.status)
      );
    }

    // Apply type filter
    if (searchConfig.filters.types.length > 0) {
      filtered = filtered.filter(contract => 
        searchConfig.filters.types.includes(contract.type)
      );
    }

    // Apply client filter
    if (searchConfig.filters.clients.length > 0) {
      filtered = filtered.filter(contract => 
        searchConfig.filters.clients.includes(contract.client)
      );
    }

    // Apply date range filter
    if (searchConfig.filters.dateRange.start) {
      filtered = filtered.filter(contract => 
        contract.uploadDate >= searchConfig.filters.dateRange.start
      );
    }
    
    if (searchConfig.filters.dateRange.end) {
      filtered = filtered.filter(contract => 
        contract.uploadDate <= searchConfig.filters.dateRange.end
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (searchConfig.sortBy) {
        case 'date':
          aValue = new Date(a.uploadDate);
          bValue = new Date(b.uploadDate);
          break;
        case 'client':
          aValue = a.client.toLowerCase();
          bValue = b.client.toLowerCase();
          break;
        case 'value':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'capacity':
          aValue = a.capacity;
          bValue = b.capacity;
          break;
        default:
          return 0;
      }
      
      if (searchConfig.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [contracts, searchConfig]);

  // Update search configuration
  const updateSearchConfig = useCallback((updates: Partial<SearchConfig>) => {
    setSearchConfig(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchConfig({
      query: '',
      filters: {
        clients: [],
        statuses: [],
        types: [],
        dateRange: {
          start: '',
          end: ''
        }
      },
      sortBy: 'date',
      sortOrder: 'desc'
    });
  }, []);

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const clients = [...new Set(contracts.map(c => c.client))].sort();
    const statuses = [...new Set(contracts.map(c => c.status))].sort();
    const types = [...new Set(contracts.map(c => c.type))].sort();
    
    return {
      clients,
      statuses,
      types
    };
  }, [contracts]);

  // Load contracts on mount
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return {
    // Data
    contracts: filteredContracts,
    allContracts: contracts,
    stats,
    filterOptions,
    
    // State
    loading,
    error,
    searchConfig,
    
    // Actions
    loadContracts,
    searchContracts,
    deleteContract,
    updateContract,
    updateSearchConfig,
    clearFilters,
    
    // Computed values
    contractCount: filteredContracts.length,
    totalCount: contracts.length,
    hasFilters: searchConfig.query.trim() !== '' || 
                searchConfig.filters.clients.length > 0 ||
                searchConfig.filters.statuses.length > 0 ||
                searchConfig.filters.types.length > 0 ||
                searchConfig.filters.dateRange.start !== '' ||
                searchConfig.filters.dateRange.end !== ''
  };
};