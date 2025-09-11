import { useState, useCallback } from 'react';
import { AIMessage, AIResponse, ContractFormData } from '../types';
import { aiService } from '../services';

/**
 * Custom hook for AI assistant functionality
 * Handles chat interface, quick actions, and AI-powered features
 */

export const useAI = () => {
  // State
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize messages from storage
  const loadMessages = useCallback(() => {
    const storedMessages = aiService.getMessageHistory();
    setMessages(storedMessages);
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async (
    message: string, 
    context?: any
  ): Promise<AIResponse | null> => {
    if (!message.trim()) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.sendMessage(message, context);
      
      // Refresh messages from storage (service updates it)
      loadMessages();
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI request failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMessages]);

  // Optimize contract pricing
  const optimizePricing = useCallback(async (
    contractData: Partial<ContractFormData>
  ): Promise<AIResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.optimizePricing(contractData);
      loadMessages();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pricing optimization failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMessages]);

  // Suggest contract terms
  const suggestTerms = useCallback(async (
    contractData: Partial<ContractFormData>
  ): Promise<AIResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.suggestTerms(contractData);
      loadMessages();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Term suggestions failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMessages]);

  // Check compliance
  const checkCompliance = useCallback(async (
    contractData: Partial<ContractFormData>
  ): Promise<AIResponse | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await aiService.checkCompliance(contractData);
      loadMessages();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compliance check failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadMessages]);

  // Generate contract summary
  const generateSummary = useCallback(async (
    contractData: ContractFormData
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const summary = await aiService.generateSummary(contractData);
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Summary generation failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear chat history
  const clearHistory = useCallback(() => {
    aiService.clearHistory();
    setMessages([]);
    setError(null);
  }, []);

  // Get quick action suggestions based on context
  const getQuickActions = useCallback((
    contractData?: Partial<ContractFormData>
  ): Array<{
    id: string;
    label: string;
    description: string;
    action: () => Promise<AIResponse | null>;
  }> => {
    const actions = [
      {
        id: 'optimize_pricing',
        label: 'Optimize Pricing',
        description: 'Analyze and suggest optimal pricing strategy',
        action: () => contractData ? optimizePricing(contractData) : sendMessage('Help me optimize contract pricing')
      },
      {
        id: 'suggest_terms',
        label: 'Suggest Terms',
        description: 'Recommend contract terms based on profile',
        action: () => contractData ? suggestTerms(contractData) : sendMessage('What contract terms do you recommend?')
      },
      {
        id: 'check_compliance',
        label: 'Check Compliance',
        description: 'Verify regulatory and safety compliance',
        action: () => contractData ? checkCompliance(contractData) : sendMessage('Help me check compliance requirements')
      },
      {
        id: 'explain_technical',
        label: 'Explain Technical',
        description: 'Get technical specifications explained',
        action: () => sendMessage('Explain the technical specifications and requirements')
      }
    ];

    return actions;
  }, [optimizePricing, suggestTerms, checkCompliance, sendMessage]);

  // Initialize on first use
  useState(() => {
    loadMessages();
  });

  return {
    // Data
    messages,
    
    // State
    loading,
    error,
    
    // Actions
    sendMessage,
    optimizePricing,
    suggestTerms,
    checkCompliance,
    generateSummary,
    clearHistory,
    getQuickActions,
    loadMessages,
    
    // Computed values
    hasMessages: messages.length > 0,
    lastMessage: messages[messages.length - 1] || null
  };
};