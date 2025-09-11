/**
 * Model Registry for AI Provider Management
 * Centralized system for discovering, registering, and managing AI models across providers
 */
export class ModelRegistry {
  constructor() {
    this.providers = new Map();
    this.models = new Map();
    this.modelCapabilities = new Map();
    this.providerHealth = new Map();
  }

  /**
   * Register an AI provider
   * @param {AIProvider} provider - Provider instance
   */
  async registerProvider(provider) {
    try {
      await provider.initialize();
      this.providers.set(provider.name, provider);
      
      // Register all models from the provider
      const models = provider.getAvailableModels();
      models.forEach(model => {
        const modelKey = `${provider.name}:${model.id}`;
        this.models.set(modelKey, {
          ...model,
          providerId: provider.name,
          isAvailable: provider.getConfigurationStatus()
        });
        
        // Index by capabilities for smart model selection
        model.capabilities.forEach(capability => {
          if (!this.modelCapabilities.has(capability)) {
            this.modelCapabilities.set(capability, []);
          }
          this.modelCapabilities.get(capability).push(modelKey);
        });
      });
      
      console.log(`✅ Provider ${provider.name} registered with ${models.length} models`);
      await this._updateProviderHealth(provider.name);
      
    } catch (error) {
      console.error(`❌ Failed to register provider ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Get all available providers
   * @returns {Array} Array of provider information
   */
  getProviders() {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      configured: provider.getConfigurationStatus(),
      modelCount: provider.getAvailableModels().length,
      health: this.providerHealth.get(name) || 'unknown'
    }));
  }

  /**
   * Get all models across all providers
   * @param {Object} filters - Filters to apply
   * @returns {Array} Array of model information
   */
  getModels(filters = {}) {
    let models = Array.from(this.models.values());

    // Apply filters
    if (filters.provider) {
      models = models.filter(model => model.providerId === filters.provider);
    }

    if (filters.capability) {
      models = models.filter(model => 
        model.capabilities.includes(filters.capability)
      );
    }

    if (filters.speed) {
      models = models.filter(model => model.speed === filters.speed);
    }

    if (filters.quality) {
      models = models.filter(model => model.quality === filters.quality);
    }

    if (filters.maxCost) {
      models = models.filter(model => 
        Math.max(model.pricing.input, model.pricing.output) <= filters.maxCost
      );
    }

    if (filters.contextLength) {
      models = models.filter(model => 
        model.contextLength >= filters.contextLength
      );
    }

    if (filters.reasoning !== undefined) {
      models = models.filter(model => 
        Boolean(model.reasoning) === filters.reasoning
      );
    }

    if (filters.beta !== undefined) {
      models = models.filter(model => 
        Boolean(model.beta) === filters.beta
      );
    }

    if (filters.available !== undefined) {
      models = models.filter(model => 
        model.isAvailable === filters.available
      );
    }

    return models;
  }

  /**
   * Get models by capability with smart ranking
   * @param {string} capability - Capability to search for
   * @param {Object} preferences - User preferences for ranking
   * @returns {Array} Ranked array of suitable models
   */
  getModelsByCapability(capability, preferences = {}) {
    const modelKeys = this.modelCapabilities.get(capability) || [];
    let models = modelKeys.map(key => this.models.get(key)).filter(Boolean);

    // Filter by availability
    models = models.filter(model => model.isAvailable);

    // Apply smart ranking based on preferences
    models.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Speed preference (higher is better)
      const speedScores = { very_fast: 4, fast: 3, medium: 2, slow: 1 };
      if (preferences.prioritizeSpeed) {
        scoreA += speedScores[a.speed] * 2;
        scoreB += speedScores[b.speed] * 2;
      }

      // Quality preference (higher is better)  
      const qualityScores = { exceptional: 5, outstanding: 4, excellent: 3, very_good: 2, good: 1 };
      if (preferences.prioritizeQuality) {
        scoreA += qualityScores[a.quality] * 2;
        scoreB += qualityScores[b.quality] * 2;
      }

      // Cost preference (lower cost is better)
      if (preferences.prioritizeCost) {
        const avgCostA = (a.pricing.input + a.pricing.output) / 2;
        const avgCostB = (b.pricing.input + b.pricing.output) / 2;
        scoreA += avgCostB > avgCostA ? 2 : 0; // Inverse scoring for cost
        scoreB += avgCostA > avgCostB ? 2 : 0;
      }

      // Context length preference
      if (preferences.longContext && preferences.longContext > 50000) {
        scoreA += a.contextLength >= preferences.longContext ? 1 : 0;
        scoreB += b.contextLength >= preferences.longContext ? 1 : 0;
      }

      // Reasoning preference
      if (preferences.reasoning) {
        scoreA += a.reasoning ? 1 : 0;
        scoreB += b.reasoning ? 1 : 0;
      }

      return scoreB - scoreA; // Higher score first
    });

    return models;
  }

  /**
   * Get the best model for a specific task
   * @param {string} task - Task type (chat, optimization, analysis, suggestion)
   * @param {Object} preferences - User preferences
   * @returns {Object} Best model for the task
   */
  getBestModelForTask(task, preferences = {}) {
    const taskCapabilityMap = {
      chat: 'chat',
      optimization: 'optimization',
      analysis: 'analysis', 
      suggestion: 'suggestions',
      reasoning: 'reasoning',
      code: 'code'
    };

    const capability = taskCapabilityMap[task] || task;
    const models = this.getModelsByCapability(capability, preferences);
    
    if (models.length === 0) {
      throw new Error(`No models available for task: ${task}`);
    }

    return models[0];
  }

  /**
   * Compare models side by side
   * @param {Array} modelIds - Array of model IDs to compare
   * @returns {Object} Comparison data
   */
  compareModels(modelIds) {
    const models = modelIds.map(id => this.models.get(id)).filter(Boolean);
    
    if (models.length === 0) {
      throw new Error('No valid models provided for comparison');
    }

    return {
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.providerId,
        pricing: model.pricing,
        speed: model.speed,
        quality: model.quality,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        reasoning: model.reasoning,
        beta: model.beta,
        bestFor: model.bestFor
      })),
      costComparison: this._generateCostComparison(models),
      speedComparison: this._generateSpeedComparison(models),
      qualityComparison: this._generateQualityComparison(models),
      recommendations: this._generateModelRecommendations(models)
    };
  }

  /**
   * Estimate cost for a request across different models
   * @param {string} text - Input text
   * @param {Array} modelIds - Models to estimate for
   * @param {number} expectedOutputTokens - Expected output length
   * @returns {Array} Cost estimates
   */
  estimateCosts(text, modelIds, expectedOutputTokens = 500) {
    return modelIds.map(modelId => {
      const model = this.models.get(modelId);
      if (!model) return null;

      const provider = this.providers.get(model.providerId);
      const inputTokens = provider.estimateTokens(text, model.id);
      const cost = provider.calculateCost(inputTokens, expectedOutputTokens, model.id);

      return {
        modelId: model.id,
        modelName: model.name,
        provider: model.providerId,
        inputTokens,
        outputTokens: expectedOutputTokens,
        totalTokens: inputTokens + expectedOutputTokens,
        cost,
        costPerToken: cost / (inputTokens + expectedOutputTokens)
      };
    }).filter(Boolean);
  }

  /**
   * Get provider health status
   * @returns {Object} Health status for all providers
   */
  async getHealthStatus() {
    const healthPromises = Array.from(this.providers.values()).map(async provider => {
      try {
        const health = await provider.getHealthStatus();
        this.providerHealth.set(provider.name, health.status);
        return health;
      } catch (error) {
        this.providerHealth.set(provider.name, 'error');
        return {
          provider: provider.name,
          status: 'error',
          error: error.message
        };
      }
    });

    const healthResults = await Promise.all(healthPromises);
    
    return {
      overall: this._calculateOverallHealth(healthResults),
      providers: healthResults,
      modelsAvailable: this.models.size,
      providersConfigured: healthResults.filter(h => h.configured).length,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Refresh provider configurations
   */
  async refreshProviders() {
    const refreshPromises = Array.from(this.providers.values()).map(async provider => {
      try {
        await provider.initialize();
        await this._updateProviderHealth(provider.name);
        return { provider: provider.name, status: 'refreshed' };
      } catch (error) {
        return { provider: provider.name, status: 'error', error: error.message };
      }
    });

    return Promise.all(refreshPromises);
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getStatistics() {
    const providers = Array.from(this.providers.keys());
    const models = Array.from(this.models.values());
    
    const stats = {
      totalProviders: providers.length,
      configuredProviders: providers.filter(p => 
        this.providers.get(p).getConfigurationStatus()
      ).length,
      totalModels: models.length,
      availableModels: models.filter(m => m.isAvailable).length,
      betaModels: models.filter(m => m.beta).length,
      reasoningModels: models.filter(m => m.reasoning).length,
      capabilities: Array.from(this.modelCapabilities.keys()),
      providerBreakdown: {}
    };

    providers.forEach(provider => {
      const providerModels = models.filter(m => m.providerId === provider);
      stats.providerBreakdown[provider] = {
        models: providerModels.length,
        available: providerModels.filter(m => m.isAvailable).length,
        beta: providerModels.filter(m => m.beta).length
      };
    });

    return stats;
  }

  // Private helper methods
  async _updateProviderHealth(providerName) {
    try {
      const provider = this.providers.get(providerName);
      const health = await provider.getHealthStatus();
      this.providerHealth.set(providerName, health.status);
    } catch (error) {
      this.providerHealth.set(providerName, 'error');
    }
  }

  _generateCostComparison(models) {
    const costs = models.map(model => ({
      model: model.id,
      inputCost: model.pricing.input,
      outputCost: model.pricing.output,
      avgCost: (model.pricing.input + model.pricing.output) / 2
    }));

    costs.sort((a, b) => a.avgCost - b.avgCost);
    
    return {
      cheapest: costs[0],
      mostExpensive: costs[costs.length - 1],
      breakdown: costs
    };
  }

  _generateSpeedComparison(models) {
    const speedOrder = ['very_fast', 'fast', 'medium', 'slow'];
    const speedScores = { very_fast: 4, fast: 3, medium: 2, slow: 1 };
    
    const speeds = models.map(model => ({
      model: model.id,
      speed: model.speed,
      score: speedScores[model.speed]
    }));

    speeds.sort((a, b) => b.score - a.score);
    
    return {
      fastest: speeds[0],
      slowest: speeds[speeds.length - 1],
      breakdown: speeds
    };
  }

  _generateQualityComparison(models) {
    const qualityScores = { exceptional: 5, outstanding: 4, excellent: 3, very_good: 2, good: 1 };
    
    const qualities = models.map(model => ({
      model: model.id,
      quality: model.quality,
      score: qualityScores[model.quality]
    }));

    qualities.sort((a, b) => b.score - a.score);
    
    return {
      highest: qualities[0],
      lowest: qualities[qualities.length - 1],
      breakdown: qualities
    };
  }

  _generateModelRecommendations(models) {
    const recommendations = [];

    // Find best for different use cases
    const chatModels = models.filter(m => m.capabilities.includes('chat'));
    const reasoningModels = models.filter(m => m.reasoning);
    const costEffectiveModels = models.filter(m => 
      (m.pricing.input + m.pricing.output) / 2 < 5.0
    );

    if (chatModels.length > 0) {
      const bestChat = chatModels.sort((a, b) => 
        (b.speed === 'very_fast' ? 1 : 0) - (a.speed === 'very_fast' ? 1 : 0)
      )[0];
      recommendations.push({
        useCase: 'General Chat',
        model: bestChat.id,
        reason: 'Fast response time with good chat capabilities'
      });
    }

    if (reasoningModels.length > 0) {
      const bestReasoning = reasoningModels[0];
      recommendations.push({
        useCase: 'Complex Reasoning',
        model: bestReasoning.id,
        reason: 'Specialized reasoning capabilities'
      });
    }

    if (costEffectiveModels.length > 0) {
      const mostCostEffective = costEffectiveModels.sort((a, b) => 
        ((a.pricing.input + a.pricing.output) / 2) - 
        ((b.pricing.input + b.pricing.output) / 2)
      )[0];
      recommendations.push({
        useCase: 'Cost Optimization',
        model: mostCostEffective.id,
        reason: 'Best value for money'
      });
    }

    return recommendations;
  }

  _calculateOverallHealth(healthResults) {
    const healthyCount = healthResults.filter(h => h.status === 'healthy').length;
    const totalCount = healthResults.length;
    
    if (totalCount === 0) return 'unknown';
    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount > totalCount / 2) return 'partial';
    return 'unhealthy';
  }
}