/**
 * Abstract base class for AI providers
 * Defines the interface that all AI providers must implement
 */
export class AIProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.models = new Map();
    this.isConfigured = false;
  }

  /**
   * Initialize the provider with API keys and configuration
   * @abstract
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Send a chat message to the AI model
   * @abstract
   * @param {string} message - The user message
   * @param {Object} options - Options including model, context, etc.
   * @returns {Promise<Object>} Response object
   */
  async chat(message, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Optimize a contract using AI
   * @abstract
   * @param {Object} contractData - Contract data to optimize
   * @param {Object} options - Options including model, context, etc.
   * @returns {Promise<Object>} Optimization response
   */
  async optimize(contractData, options = {}) {
    throw new Error('optimize() must be implemented by subclass');
  }

  /**
   * Analyze a contract for insights
   * @abstract
   * @param {Object} contractData - Contract data to analyze
   * @param {Object} options - Options including model, context, etc.
   * @returns {Promise<Object>} Analysis response
   */
  async analyze(contractData, options = {}) {
    throw new Error('analyze() must be implemented by subclass');
  }

  /**
   * Suggest contract terms based on partial data
   * @abstract
   * @param {Object} partialData - Partial contract data
   * @param {Object} options - Options including model, context, etc.
   * @returns {Promise<Object>} Suggestions response
   */
  async suggest(partialData, options = {}) {
    throw new Error('suggest() must be implemented by subclass');
  }

  /**
   * Estimate token count for a given text
   * @abstract
   * @param {string} text - Text to estimate tokens for
   * @param {string} model - Model to estimate for
   * @returns {number} Estimated token count
   */
  estimateTokens(text, model) {
    throw new Error('estimateTokens() must be implemented by subclass');
  }

  /**
   * Calculate cost for a request
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens  
   * @param {string} model - Model name
   * @returns {number} Cost in USD
   */
  calculateCost(inputTokens, outputTokens, model) {
    const modelInfo = this.models.get(model);
    if (!modelInfo) {
      throw new Error(`Model ${model} not found for provider ${this.name}`);
    }

    const inputCost = (inputTokens / 1000000) * modelInfo.pricing.input;
    const outputCost = (outputTokens / 1000000) * modelInfo.pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Get all available models for this provider
   * @returns {Array} Array of model objects
   */
  getAvailableModels() {
    return Array.from(this.models.entries()).map(([id, info]) => ({
      id,
      ...info,
      provider: this.name
    }));
  }

  /**
   * Get model capabilities and metadata
   * @param {string} modelId - Model identifier
   * @returns {Object} Model metadata
   */
  getModelInfo(modelId) {
    const modelInfo = this.models.get(modelId);
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not found for provider ${this.name}`);
    }
    
    return {
      id: modelId,
      ...modelInfo,
      provider: this.name
    };
  }

  /**
   * Check if provider is properly configured
   * @returns {boolean} Configuration status
   */
  getConfigurationStatus() {
    return this.isConfigured;
  }

  /**
   * Get provider health status
   * @returns {Object} Health status information
   */
  async getHealthStatus() {
    return {
      provider: this.name,
      configured: this.isConfigured,
      modelsAvailable: this.models.size,
      status: this.isConfigured ? 'healthy' : 'not_configured'
    };
  }

  /**
   * Register a model with the provider
   * @protected
   * @param {string} modelId - Model identifier
   * @param {Object} modelInfo - Model metadata and pricing
   */
  _registerModel(modelId, modelInfo) {
    this.models.set(modelId, {
      name: modelInfo.name || modelId,
      description: modelInfo.description || '',
      pricing: {
        input: modelInfo.pricing.input,
        output: modelInfo.pricing.output
      },
      contextLength: modelInfo.contextLength || 4096,
      capabilities: modelInfo.capabilities || [],
      beta: modelInfo.beta || false,
      reasoning: modelInfo.reasoning || false,
      speed: modelInfo.speed || 'medium',
      quality: modelInfo.quality || 'good',
      bestFor: modelInfo.bestFor || []
    });
  }

  /**
   * Build system prompt for different contexts
   * @protected
   * @param {string} context - Context type (optimization, analysis, chat, etc.)
   * @returns {string} System prompt
   */
  _buildSystemPrompt(context) {
    const basePrompt = `You are an expert in Bloom Energy fuel cell contracts and energy service agreements.
    
    Key constraints to remember:
    - Capacity must be in multiples of 325kW (range: 325kW - 3900kW)
    - Contract terms: 5, 10, 15, or 20 years
    - Escalation rates: typically 2.0% - 5.0% annually
    - System types: Power Purchase (PP), Microgrid (MG), Advanced Microgrid (AMG), On-site Generation (OG)
    - Voltage levels: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
    - Components: RI (Renewable Integration), AC (Advanced Controls), UC (Utility Connections), BESS (Battery Energy Storage)`;

    const contextPrompts = {
      optimization: `${basePrompt}
        
        Focus on optimizing contract parameters, suggesting improvements, and providing analysis.
        Provide concise, actionable recommendations focused on optimizing value, risk mitigation, and operational efficiency.`,
      
      analysis: `${basePrompt}
        
        Analyze contracts for patterns, anomalies, and insights. Look for trends in pricing, terms, 
        system configurations, and identify opportunities for standardization. Provide data-driven insights 
        and flag any unusual parameters that might need review.`,
      
      chat: `${basePrompt}
        
        You help users create, analyze, and optimize energy service contracts. Provide clear, actionable guidance 
        while adhering to Bloom Energy's business rules and industry best practices.`,
      
      suggestion: `${basePrompt}
        
        Based on partial contract information, suggest appropriate values for missing fields. 
        Consider industry standards and Bloom Energy best practices.`
    };

    return contextPrompts[context] || contextPrompts.chat;
  }

  /**
   * Parse and structure AI response
   * @protected
   * @param {string} rawResponse - Raw response from AI
   * @param {string} context - Context type
   * @returns {Object} Structured response
   */
  _parseResponse(rawResponse, context) {
    const baseResponse = {
      message: rawResponse,
      timestamp: new Date().toISOString(),
      provider: this.name
    };

    switch (context) {
      case 'optimization':
        return {
          ...baseResponse,
          suggestions: this._extractSuggestions(rawResponse),
          actions: this._extractActions(rawResponse)
        };
      
      case 'analysis':
        return {
          ...baseResponse,
          insights: this._extractInsights(rawResponse),
          alerts: this._extractAlerts(rawResponse),
          riskScore: this._calculateRiskScore(rawResponse)
        };
      
      case 'suggestion':
        return {
          ...baseResponse,
          suggestions: this._extractFieldSuggestions(rawResponse),
          confidence: this._calculateConfidence(rawResponse)
        };
      
      default:
        return baseResponse;
    }
  }

  // Helper methods for response parsing
  _extractSuggestions(text) {
    const suggestions = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('recommend') || line.includes('suggest')) {
        suggestions.push(line.trim());
      }
    });
    
    return suggestions.slice(0, 5);
  }

  _extractActions(text) {
    return [
      {
        type: 'optimize_pricing',
        label: 'Apply Pricing Recommendations',
        data: { reasoning: 'AI-generated recommendations' }
      }
    ];
  }

  _extractInsights(text) {
    return ['AI-generated insights based on contract analysis'];
  }

  _extractAlerts(text) {
    const alertWords = ['concern', 'risk', 'unusual', 'problem', 'issue'];
    const hasAlerts = alertWords.some(word => text.toLowerCase().includes(word));
    return hasAlerts ? ['Potential issues identified in contract terms'] : [];
  }

  _calculateRiskScore(text) {
    const riskWords = ['risk', 'concern', 'unusual', 'high', 'problem'];
    const riskCount = riskWords.reduce((count, word) => {
      return count + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);
    
    return Math.min(riskCount * 10, 100);
  }

  _extractFieldSuggestions(text) {
    return {
      capacity: null,
      term: null,
      baseRate: null,
      escalation: null
    };
  }

  _calculateConfidence(text) {
    return 0.8; // Default confidence score
  }
}