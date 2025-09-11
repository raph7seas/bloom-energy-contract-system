import { ModelRegistry } from './ModelRegistry.js';
import { CostCalculator } from './CostCalculator.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

/**
 * AI Manager
 * Central management system for all AI providers and operations
 */
export class AIManager {
  constructor() {
    this.registry = new ModelRegistry();
    this.costCalculator = new CostCalculator(this.registry);
    this.initialized = false;
  }

  /**
   * Initialize all AI providers and systems
   */
  async initialize() {
    try {
      // Initialize providers
      const anthropicProvider = new AnthropicProvider();
      const openaiProvider = new OpenAIProvider();

      // Register providers with the registry
      await this.registry.registerProvider(anthropicProvider);
      await this.registry.registerProvider(openaiProvider);

      this.initialized = true;
      console.log('🎯 AI Manager initialized successfully');
      
      // Log initialization status
      const stats = this.registry.getStatistics();
      console.log(`📊 AI Stats: ${stats.totalProviders} providers, ${stats.availableModels} available models`);

      return {
        success: true,
        statistics: stats,
        providers: this.registry.getProviders()
      };
    } catch (error) {
      console.error('❌ Failed to initialize AI Manager:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Send chat message using specified or optimal model
   * @param {string} message - User message
   * @param {Object} options - Options including model selection
   * @returns {Promise<Object>} AI response with cost tracking
   */
  async chat(message, options = {}) {
    this._ensureInitialized();

    const {
      modelId,
      provider: preferredProvider,
      context = {},
      conversationHistory = [],
      preferences = {}
    } = options;

    let selectedModel;

    if (modelId) {
      // Use specific model
      const model = this.registry.models.get(modelId);
      if (!model || !model.isAvailable) {
        throw new Error(`Model ${modelId} is not available`);
      }
      selectedModel = model;
    } else {
      // Auto-select best model for chat
      selectedModel = this.registry.getBestModelForTask('chat', {
        provider: preferredProvider,
        ...preferences
      });
    }

    const providerInstance = this.registry.providers.get(selectedModel.providerId);
    const startTime = Date.now();

    try {
      const response = await providerInstance.chat(message, {
        model: selectedModel.id,
        context,
        conversationHistory,
        ...options
      });

      // Record usage for analytics
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'chat',
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        cost: response.usage?.cost || 0,
        responseTime: Date.now() - startTime,
        success: true
      });

      return {
        ...response,
        metadata: {
          selectedModel: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.providerId
          },
          responseTime: Date.now() - startTime,
          autoSelected: !modelId
        }
      };

    } catch (error) {
      // Record failed usage
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'chat',
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Optimize contract using AI
   * @param {Object} contractData - Contract data
   * @param {Object} options - Options including model selection
   * @returns {Promise<Object>} Optimization response
   */
  async optimize(contractData, options = {}) {
    this._ensureInitialized();

    const {
      modelId,
      provider: preferredProvider,
      context = {},
      preferences = {}
    } = options;

    let selectedModel;

    if (modelId) {
      selectedModel = this.registry.models.get(modelId);
      if (!selectedModel || !selectedModel.isAvailable) {
        throw new Error(`Model ${modelId} is not available`);
      }
    } else {
      // Auto-select best model for optimization
      selectedModel = this.registry.getBestModelForTask('optimization', {
        provider: preferredProvider,
        prioritizeQuality: true, // Optimization tasks benefit from higher quality
        ...preferences
      });
    }

    const providerInstance = this.registry.providers.get(selectedModel.providerId);
    const startTime = Date.now();

    try {
      const response = await providerInstance.optimize(contractData, {
        model: selectedModel.id,
        context,
        ...options
      });

      // Record usage
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'optimization',
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        cost: response.usage?.cost || 0,
        responseTime: Date.now() - startTime,
        success: true
      });

      return {
        ...response,
        metadata: {
          selectedModel: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.providerId
          },
          responseTime: Date.now() - startTime,
          autoSelected: !modelId
        }
      };

    } catch (error) {
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'optimization',
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Analyze contract using AI
   * @param {Object} contractData - Contract data
   * @param {Object} options - Options including model selection
   * @returns {Promise<Object>} Analysis response
   */
  async analyze(contractData, options = {}) {
    this._ensureInitialized();

    const {
      modelId,
      provider: preferredProvider,
      preferences = {}
    } = options;

    let selectedModel;

    if (modelId) {
      selectedModel = this.registry.models.get(modelId);
      if (!selectedModel || !selectedModel.isAvailable) {
        throw new Error(`Model ${modelId} is not available`);
      }
    } else {
      // Auto-select best model for analysis
      selectedModel = this.registry.getBestModelForTask('analysis', {
        provider: preferredProvider,
        prioritizeQuality: true,
        ...preferences
      });
    }

    const providerInstance = this.registry.providers.get(selectedModel.providerId);
    const startTime = Date.now();

    try {
      const response = await providerInstance.analyze(contractData, {
        model: selectedModel.id,
        ...options
      });

      // Record usage
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'analysis',
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        cost: response.usage?.cost || 0,
        responseTime: Date.now() - startTime,
        success: true
      });

      return {
        ...response,
        metadata: {
          selectedModel: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.providerId
          },
          responseTime: Date.now() - startTime,
          autoSelected: !modelId
        }
      };

    } catch (error) {
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'analysis',
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Get contract suggestions using AI
   * @param {Object} partialData - Partial contract data
   * @param {Object} options - Options including model selection
   * @returns {Promise<Object>} Suggestions response
   */
  async suggest(partialData, options = {}) {
    this._ensureInitialized();

    const {
      modelId,
      provider: preferredProvider,
      preferences = {}
    } = options;

    let selectedModel;

    if (modelId) {
      selectedModel = this.registry.models.get(modelId);
      if (!selectedModel || !selectedModel.isAvailable) {
        throw new Error(`Model ${modelId} is not available`);
      }
    } else {
      // Auto-select best model for suggestions (prioritize speed for quick suggestions)
      selectedModel = this.registry.getBestModelForTask('suggestion', {
        provider: preferredProvider,
        prioritizeSpeed: true,
        ...preferences
      });
    }

    const providerInstance = this.registry.providers.get(selectedModel.providerId);
    const startTime = Date.now();

    try {
      const response = await providerInstance.suggest(partialData, {
        model: selectedModel.id,
        ...options
      });

      // Record usage
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'suggestion',
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
        cost: response.usage?.cost || 0,
        responseTime: Date.now() - startTime,
        success: true
      });

      return {
        ...response,
        metadata: {
          selectedModel: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.providerId
          },
          responseTime: Date.now() - startTime,
          autoSelected: !modelId
        }
      };

    } catch (error) {
      this.costCalculator.recordUsage({
        modelId: `${selectedModel.providerId}:${selectedModel.id}`,
        provider: selectedModel.providerId,
        task: 'suggestion',
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Get all available models
   * @param {Object} filters - Optional filters
   * @returns {Array} Available models
   */
  getModels(filters = {}) {
    this._ensureInitialized();
    return this.registry.getModels(filters);
  }

  /**
   * Get all providers
   * @returns {Array} Available providers
   */
  getProviders() {
    this._ensureInitialized();
    return this.registry.getProviders();
  }

  /**
   * Compare model costs for a given input
   * @param {Array} modelIds - Models to compare
   * @param {number} inputTokens - Input token count
   * @param {number} outputTokens - Output token count
   * @returns {Object} Cost comparison
   */
  compareModelCosts(modelIds, inputTokens, outputTokens) {
    this._ensureInitialized();
    return this.costCalculator.compareModelCosts(modelIds, inputTokens, outputTokens);
  }

  /**
   * Estimate costs for different text lengths
   * @param {string} modelId - Model to estimate for
   * @param {Array} textLengths - Text lengths to estimate
   * @param {Object} options - Estimation options
   * @returns {Object} Cost estimates
   */
  estimateCosts(modelId, textLengths, options = {}) {
    this._ensureInitialized();
    return this.costCalculator.estimateCostsByLength(modelId, textLengths, options);
  }

  /**
   * Calculate monthly cost projection
   * @param {string} modelId - Model to calculate for
   * @param {Object} usage - Usage patterns
   * @returns {Object} Monthly projection
   */
  calculateMonthlyProjection(modelId, usage) {
    this._ensureInitialized();
    return this.costCalculator.calculateMonthlyProjection(modelId, usage);
  }

  /**
   * Analyze cost efficiency across models
   * @param {Array} modelIds - Models to analyze
   * @param {Object} useCases - Use case scenarios
   * @returns {Object} Efficiency analysis
   */
  analyzeCostEfficiency(modelIds, useCases = {}) {
    this._ensureInitialized();
    return this.costCalculator.analyzeCostEfficiency(modelIds, useCases);
  }

  /**
   * Get usage analytics
   * @param {Object} filters - Time and model filters
   * @returns {Object} Usage analytics
   */
  getUsageAnalytics(filters = {}) {
    this._ensureInitialized();
    return this.costCalculator.getUsageAnalytics(filters);
  }

  /**
   * Get system health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    if (!this.initialized) {
      return {
        status: 'not_initialized',
        message: 'AI Manager not initialized'
      };
    }

    try {
      const registryHealth = await this.registry.getHealthStatus();
      const statistics = this.registry.getStatistics();
      
      return {
        status: registryHealth.overall,
        initialized: this.initialized,
        registry: registryHealth,
        statistics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Refresh all provider configurations
   * @returns {Promise<Array>} Refresh results
   */
  async refreshProviders() {
    this._ensureInitialized();
    return this.registry.refreshProviders();
  }

  /**
   * Get model recommendations for a specific use case
   * @param {string} useCase - Use case type
   * @param {Object} preferences - User preferences
   * @returns {Object} Model recommendations
   */
  getModelRecommendations(useCase, preferences = {}) {
    this._ensureInitialized();

    const availableModels = this.registry.getModels({ available: true });
    const modelIds = availableModels.map(m => `${m.providerId}:${m.id}`);

    // Define use case scenarios
    const useCaseScenarios = {
      [useCase]: {
        input: preferences.inputTokens || 1000,
        output: preferences.outputTokens || 500,
        priority: preferences.priority || 'balance'
      }
    };

    const efficiency = this.costCalculator.analyzeCostEfficiency(modelIds, useCaseScenarios);
    
    return {
      useCase,
      preferences,
      recommendations: efficiency.analysis[useCase],
      alternatives: efficiency.analysis[useCase]?.alternatives || [],
      summary: efficiency.summary
    };
  }

  // Private helper methods
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AI Manager not initialized. Call initialize() first.');
    }
  }
}