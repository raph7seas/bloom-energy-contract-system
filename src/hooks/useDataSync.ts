/**
 * React hook for synchronized data management
 * Replaces direct localStorage usage with API-first approach + localStorage fallback
 */

import { useState, useEffect, useCallback } from 'react';
import dataService, { LearnedRule, Template, UserPreferences, AIMessage } from '../services/dataService';

interface UseDataSyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
  loadOnMount?: boolean;
}

interface DataState {
  contracts: any[];
  learnedRules: LearnedRule[];
  templates: Template[];
  userPreferences: UserPreferences;
  aiMessages: AIMessage[];
}

interface DataActions {
  // Contract operations
  addContract: (contract: any) => Promise<void>;
  updateContract: (id: string, updates: any) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  
  // Learned rules operations
  updateLearnedRules: (rules: LearnedRule[]) => Promise<void>;
  addLearnedRule: (rule: LearnedRule) => Promise<void>;
  
  // Template operations
  addTemplate: (template: Template) => Promise<void>;
  
  // AI message operations
  addAIMessage: (message: AIMessage) => Promise<void>;
  
  // User preferences
  updateUserPreferences: (preferences: UserPreferences) => Promise<void>;
  
  // Sync operations
  syncData: () => Promise<void>;
  clearCache: () => void;
  refreshCache: () => Promise<void>;
}

interface LoadingState {
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}

export const useDataSync = (options: UseDataSyncOptions = {}): [DataState, DataActions, LoadingState] => {
  const {
    autoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    loadOnMount = true
  } = options;

  // State
  const [data, setData] = useState<DataState>({
    contracts: [],
    learnedRules: [],
    templates: [],
    userPreferences: {
      theme: 'light',
      defaultView: 'dashboard',
      notifications: true,
      autoSave: true,
      language: 'en'
    },
    aiMessages: []
  });

  const [loading, setLoading] = useState<LoadingState>({
    isLoading: loadOnMount,
    isSyncing: false,
    error: null
  });

  // Sync data from API/localStorage
  const syncData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, isSyncing: true, error: null }));
      
      const syncedData = await dataService.syncData();
      
      setData(prev => ({
        ...prev,
        contracts: syncedData.contracts,
        learnedRules: syncedData.rules,
        templates: syncedData.templates,
        userPreferences: syncedData.preferences
      }));

      setLoading(prev => ({ ...prev, error: null }));
    } catch (error) {
      console.error('Data sync failed:', error);
      setLoading(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, isLoading: false, isSyncing: false }));
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (loadOnMount) {
      syncData();
    }
  }, [loadOnMount, syncData]);

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !dataService.isOnline()) return;

    const interval = setInterval(syncData, syncInterval);
    return () => clearInterval(interval);
  }, [autoSync, syncInterval, syncData]);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      if (autoSync) {
        syncData();
      }
    };

    const handleOffline = () => {
      console.log('App is offline - using cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, syncData]);

  // Contract operations
  const addContract = useCallback(async (contract: any) => {
    try {
      const savedContract = await dataService.saveContract(contract);
      setData(prev => ({
        ...prev,
        contracts: [...prev.contracts, savedContract]
      }));
    } catch (error) {
      console.error('Failed to add contract:', error);
      throw error;
    }
  }, []);

  const updateContract = useCallback(async (id: string, updates: any) => {
    try {
      const updatedContract = await dataService.updateContract(id, updates);
      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => c.id === id ? updatedContract : c)
      }));
    } catch (error) {
      console.error('Failed to update contract:', error);
      throw error;
    }
  }, []);

  const deleteContract = useCallback(async (id: string) => {
    try {
      await dataService.deleteContract(id);
      setData(prev => ({
        ...prev,
        contracts: prev.contracts.filter(c => c.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete contract:', error);
      throw error;
    }
  }, []);

  // Learned rules operations
  const updateLearnedRules = useCallback(async (rules: LearnedRule[]) => {
    try {
      await dataService.saveLearnedRules(rules);
      setData(prev => ({
        ...prev,
        learnedRules: rules
      }));
    } catch (error) {
      console.error('Failed to update learned rules:', error);
      throw error;
    }
  }, []);

  const addLearnedRule = useCallback(async (rule: LearnedRule) => {
    try {
      setData(prev => ({
        ...prev,
        learnedRules: [...prev.learnedRules, rule]
      }));
      await dataService.saveLearnedRules([...data.learnedRules, rule]);
    } catch (error) {
      console.error('Failed to add learned rule:', error);
      // Rollback on failure
      setData(prev => ({
        ...prev,
        learnedRules: prev.learnedRules.filter(r => r.id !== rule.id)
      }));
      throw error;
    }
  }, [data.learnedRules]);

  // Template operations
  const addTemplate = useCallback(async (template: Template) => {
    try {
      const savedTemplate = await dataService.saveTemplate(template);
      setData(prev => ({
        ...prev,
        templates: [...prev.templates, savedTemplate]
      }));
    } catch (error) {
      console.error('Failed to add template:', error);
      throw error;
    }
  }, []);

  // AI message operations
  const addAIMessage = useCallback(async (message: AIMessage) => {
    try {
      await dataService.saveAIMessage(message);
      setData(prev => ({
        ...prev,
        aiMessages: [...prev.aiMessages, message]
      }));
    } catch (error) {
      console.error('Failed to add AI message:', error);
      // Still add to local state for user experience
      setData(prev => ({
        ...prev,
        aiMessages: [...prev.aiMessages, message]
      }));
    }
  }, []);

  // User preferences
  const updateUserPreferences = useCallback(async (preferences: UserPreferences) => {
    try {
      await dataService.saveUserPreferences(preferences);
      setData(prev => ({
        ...prev,
        userPreferences: preferences
      }));
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }, []);

  // Cache operations
  const clearCache = useCallback(() => {
    dataService.clearCache();
    setData({
      contracts: [],
      learnedRules: [],
      templates: [],
      userPreferences: {
        theme: 'light',
        defaultView: 'dashboard',
        notifications: true,
        autoSave: true,
        language: 'en'
      },
      aiMessages: []
    });
  }, []);

  const refreshCache = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, isSyncing: true }));
      await dataService.refreshCache();
      await syncData();
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      setLoading(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Cache refresh failed' 
      }));
    }
  }, [syncData]);

  const actions: DataActions = {
    addContract,
    updateContract,
    deleteContract,
    updateLearnedRules,
    addLearnedRule,
    addTemplate,
    addAIMessage,
    updateUserPreferences,
    syncData,
    clearCache,
    refreshCache
  };

  return [data, actions, loading];
};

// Specialized hooks for individual data types
export const useContracts = () => {
  const [data, actions, loading] = useDataSync({ loadOnMount: true });
  
  return {
    contracts: data.contracts,
    addContract: actions.addContract,
    updateContract: actions.updateContract,
    deleteContract: actions.deleteContract,
    isLoading: loading.isLoading,
    error: loading.error,
    syncContracts: actions.syncData
  };
};

export const useLearnedRules = () => {
  const [data, actions, loading] = useDataSync({ loadOnMount: true });
  
  return {
    learnedRules: data.learnedRules,
    updateLearnedRules: actions.updateLearnedRules,
    addLearnedRule: actions.addLearnedRule,
    isLoading: loading.isLoading,
    error: loading.error,
    syncRules: actions.syncData
  };
};

export const useTemplates = () => {
  const [data, actions, loading] = useDataSync({ loadOnMount: true });
  
  return {
    templates: data.templates,
    addTemplate: actions.addTemplate,
    isLoading: loading.isLoading,
    error: loading.error,
    syncTemplates: actions.syncData
  };
};

export default useDataSync;