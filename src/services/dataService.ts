/**
 * Unified Data Service for replacing localStorage with API integration
 * Acts as a facade for all data operations with proper error handling and fallbacks
 */

import contractService from './contractService';
import { loadFromLocalStorage, saveToLocalStorage, STORAGE_KEYS } from '../utils/storage';

export interface LearnedRule {
  id: string;
  ruleType: string;
  category: string;
  name: string;
  ruleData: any;
  confidence: number;
  occurrences: number;
  lastSeen: string;
  isActive: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  formData: any;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultView: string;
  notifications: boolean;
  autoSave: boolean;
  language: string;
}

export interface AIMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

class DataService {
  private readonly apiUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    // Get auth token from localStorage on initialization
    this.authToken = localStorage.getItem('bloom_auth_token');
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // ============= CONTRACT OPERATIONS =============
  
  async getContracts(): Promise<any[]> {
    try {
      return await contractService.getContracts();
    } catch (error) {
      console.warn('API failed, loading contracts from localStorage:', error);
      return loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
    }
  }

  async saveContract(contract: any): Promise<any> {
    try {
      const savedContract = await contractService.createContract(contract);
      
      // Update localStorage cache
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.filter((c: any) => c.id !== contract.id);
      updatedContracts.push(savedContract);
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
      
      return savedContract;
    } catch (error) {
      console.warn('API failed, saving contract to localStorage only:', error);
      
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.filter((c: any) => c.id !== contract.id);
      updatedContracts.push(contract);
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
      
      return contract;
    }
  }

  async updateContract(id: string, updates: any): Promise<any> {
    try {
      const updatedContract = await contractService.updateContract(id, updates);
      
      // Update localStorage cache
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.map((c: any) => 
        c.id === id ? { ...c, ...updates } : c
      );
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
      
      return updatedContract;
    } catch (error) {
      console.warn('API failed, updating contract in localStorage only:', error);
      
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.map((c: any) => 
        c.id === id ? { ...c, ...updates } : c
      );
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
      
      return { ...updates, id };
    }
  }

  async deleteContract(id: string): Promise<void> {
    try {
      await contractService.deleteContract(id);
      
      // Update localStorage cache
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.filter((c: any) => c.id !== id);
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
    } catch (error) {
      console.warn('API failed, deleting contract from localStorage only:', error);
      
      const contracts = loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []);
      const updatedContracts = contracts.filter((c: any) => c.id !== id);
      saveToLocalStorage(STORAGE_KEYS.CONTRACTS, updatedContracts);
    }
  }

  // ============= LEARNED RULES OPERATIONS =============
  
  async getLearnedRules(): Promise<LearnedRule[]> {
    try {
      const response = await this.makeRequest<{ rules: LearnedRule[] }>('/rules');
      return response.rules || [];
    } catch (error) {
      console.warn('API failed, loading learned rules from localStorage:', error);
      return loadFromLocalStorage(STORAGE_KEYS.LEARNED_RULES, []);
    }
  }

  async saveLearnedRules(rules: LearnedRule[]): Promise<void> {
    try {
      await this.makeRequest('/rules', {
        method: 'POST',
        body: JSON.stringify({ rules }),
      });
      
      // Update localStorage cache
      saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, rules);
    } catch (error) {
      console.warn('API failed, saving learned rules to localStorage only:', error);
      saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, rules);
    }
  }

  async updateLearnedRule(id: string, updates: Partial<LearnedRule>): Promise<LearnedRule> {
    try {
      const response = await this.makeRequest<{ rule: LearnedRule }>(`/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      // Update localStorage cache
      const rules = loadFromLocalStorage(STORAGE_KEYS.LEARNED_RULES, []);
      const updatedRules = rules.map((r: LearnedRule) => 
        r.id === id ? { ...r, ...updates } : r
      );
      saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, updatedRules);
      
      return response.rule;
    } catch (error) {
      console.warn('API failed, updating learned rule in localStorage only:', error);
      
      const rules = loadFromLocalStorage(STORAGE_KEYS.LEARNED_RULES, []);
      const updatedRules = rules.map((r: LearnedRule) => 
        r.id === id ? { ...r, ...updates } : r
      );
      saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, updatedRules);
      
      return { id, ...updates } as LearnedRule;
    }
  }

  // ============= TEMPLATE OPERATIONS =============
  
  async getTemplates(): Promise<Template[]> {
    try {
      const response = await this.makeRequest<{ templates: Template[] }>('/templates');
      return response.templates || [];
    } catch (error) {
      console.warn('API failed, loading templates from localStorage:', error);
      return loadFromLocalStorage(STORAGE_KEYS.TEMPLATES, []);
    }
  }

  async saveTemplate(template: Template): Promise<Template> {
    try {
      const response = await this.makeRequest<{ template: Template }>('/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
      
      // Update localStorage cache
      const templates = loadFromLocalStorage(STORAGE_KEYS.TEMPLATES, []);
      const updatedTemplates = templates.filter((t: Template) => t.id !== template.id);
      updatedTemplates.push(response.template);
      saveToLocalStorage(STORAGE_KEYS.TEMPLATES, updatedTemplates);
      
      return response.template;
    } catch (error) {
      console.warn('API failed, saving template to localStorage only:', error);
      
      const templates = loadFromLocalStorage(STORAGE_KEYS.TEMPLATES, []);
      const updatedTemplates = templates.filter((t: Template) => t.id !== template.id);
      updatedTemplates.push(template);
      saveToLocalStorage(STORAGE_KEYS.TEMPLATES, updatedTemplates);
      
      return template;
    }
  }

  // ============= AI MESSAGES OPERATIONS =============
  
  async getAIMessages(sessionId?: string): Promise<AIMessage[]> {
    try {
      const endpoint = sessionId ? `/ai/messages?sessionId=${sessionId}` : '/ai/messages';
      const response = await this.makeRequest<{ messages: AIMessage[] }>(endpoint);
      return response.messages || [];
    } catch (error) {
      console.warn('API failed, loading AI messages from localStorage:', error);
      const allMessages = loadFromLocalStorage(STORAGE_KEYS.AI_MESSAGES, []);
      return sessionId 
        ? allMessages.filter((m: AIMessage) => m.sessionId === sessionId)
        : allMessages;
    }
  }

  async saveAIMessage(message: AIMessage): Promise<void> {
    try {
      await this.makeRequest('/ai/messages', {
        method: 'POST',
        body: JSON.stringify(message),
      });
      
      // Update localStorage cache
      const messages = loadFromLocalStorage(STORAGE_KEYS.AI_MESSAGES, []);
      messages.push(message);
      saveToLocalStorage(STORAGE_KEYS.AI_MESSAGES, messages);
    } catch (error) {
      console.warn('API failed, saving AI message to localStorage only:', error);
      
      const messages = loadFromLocalStorage(STORAGE_KEYS.AI_MESSAGES, []);
      messages.push(message);
      saveToLocalStorage(STORAGE_KEYS.AI_MESSAGES, messages);
    }
  }

  // ============= USER PREFERENCES =============
  
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const response = await this.makeRequest<{ preferences: UserPreferences }>('/user/preferences');
      return response.preferences;
    } catch (error) {
      console.warn('API failed, loading preferences from localStorage:', error);
      return loadFromLocalStorage(STORAGE_KEYS.USER_PREFERENCES, {
        theme: 'light',
        defaultView: 'dashboard',
        notifications: true,
        autoSave: true,
        language: 'en'
      });
    }
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await this.makeRequest('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      
      // Update localStorage cache
      saveToLocalStorage(STORAGE_KEYS.USER_PREFERENCES, preferences);
    } catch (error) {
      console.warn('API failed, saving preferences to localStorage only:', error);
      saveToLocalStorage(STORAGE_KEYS.USER_PREFERENCES, preferences);
    }
  }

  // ============= AUTHENTICATION =============
  
  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      localStorage.setItem('bloom_auth_token', token);
    } else {
      localStorage.removeItem('bloom_auth_token');
    }
  }

  getAuthToken(): string | null {
    return this.authToken || localStorage.getItem('bloom_auth_token');
  }

  // ============= SYNC OPERATIONS =============
  
  async syncData(): Promise<{
    contracts: any[];
    rules: LearnedRule[];
    templates: Template[];
    preferences: UserPreferences;
  }> {
    try {
      const [contracts, rules, templates, preferences] = await Promise.all([
        this.getContracts(),
        this.getLearnedRules(),
        this.getTemplates(),
        this.getUserPreferences(),
      ]);

      return { contracts, rules, templates, preferences };
    } catch (error) {
      console.error('Data sync failed:', error);
      
      // Return localStorage data as fallback
      return {
        contracts: loadFromLocalStorage(STORAGE_KEYS.CONTRACTS, []),
        rules: loadFromLocalStorage(STORAGE_KEYS.LEARNED_RULES, []),
        templates: loadFromLocalStorage(STORAGE_KEYS.TEMPLATES, []),
        preferences: loadFromLocalStorage(STORAGE_KEYS.USER_PREFERENCES, {
          theme: 'light',
          defaultView: 'dashboard',
          notifications: true,
          autoSave: true,
          language: 'en'
        })
      };
    }
  }

  // ============= OFFLINE SUPPORT =============
  
  isOnline(): boolean {
    return navigator.onLine;
  }

  async waitForOnline(): Promise<void> {
    if (this.isOnline()) return;

    return new Promise((resolve) => {
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };
      window.addEventListener('online', handleOnline);
    });
  }

  // ============= CACHE MANAGEMENT =============
  
  clearCache(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  async refreshCache(): Promise<void> {
    const data = await this.syncData();
    
    saveToLocalStorage(STORAGE_KEYS.CONTRACTS, data.contracts);
    saveToLocalStorage(STORAGE_KEYS.LEARNED_RULES, data.rules);
    saveToLocalStorage(STORAGE_KEYS.TEMPLATES, data.templates);
    saveToLocalStorage(STORAGE_KEYS.USER_PREFERENCES, data.preferences);
  }
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;