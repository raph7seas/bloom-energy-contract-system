import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './AIProvider.js';

/**
 * Anthropic Claude AI Provider
 * Implements all Claude models including current and upcoming releases
 */
export class AnthropicProvider extends AIProvider {
  constructor() {
    super('anthropic');
    this.anthropic = null;
    this._registerAllModels();
  }

  async initialize() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('Anthropic API key not configured');
      this.isConfigured = false;
      return;
    }

    try {
      this.anthropic = new Anthropic({ apiKey });
      this.isConfigured = true;
      console.log(`✅ Anthropic provider initialized with ${this.models.size} models`);
    } catch (error) {
      console.error('Failed to initialize Anthropic provider:', error);
      this.isConfigured = false;
    }
  }

  async chat(message, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(message, 'chat');
    }

    const {
      model = 'claude-3-5-sonnet-20241022',
      context = {},
      conversationHistory = [],
      maxTokens = 1500
    } = options;

    try {
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: this._buildSystemPrompt('chat'),
        messages
      });

      const responseText = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        message: responseText,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Anthropic chat error:', error);
      return this._generateMockResponse(message, 'chat');
    }
  }

  async optimize(contractData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(contractData, 'optimization');
    }

    const {
      model = 'claude-3-5-sonnet-20241022',
      context = {},
      maxTokens = 1500
    } = options;

    try {
      const prompt = this._buildOptimizationPrompt(contractData, context);
      
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: this._buildSystemPrompt('optimization'),
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        ...this._parseResponse(responseText, 'optimization'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('Anthropic optimization error:', error);
      return this._generateMockResponse(contractData, 'optimization');
    }
  }

  async analyze(contractData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(contractData, 'analysis');
    }

    const {
      model = 'claude-3-5-sonnet-20241022',
      maxTokens = 1500
    } = options;

    try {
      const prompt = this._buildAnalysisPrompt(contractData);
      
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: this._buildSystemPrompt('analysis'),
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        ...this._parseResponse(responseText, 'analysis'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('Anthropic analysis error:', error);
      return this._generateMockResponse(contractData, 'analysis');
    }
  }

  async suggest(partialData, options = {}) {
    if (!this.isConfigured) {
      return this._generateMockResponse(partialData, 'suggestion');
    }

    const {
      model = 'claude-3-5-haiku-20241022', // Use faster model for suggestions
      maxTokens = 1000
    } = options;

    try {
      const prompt = this._buildSuggestionsPrompt(partialData);
      
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: this._buildSystemPrompt('suggestion'),
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].text;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      return {
        ...this._parseResponse(responseText, 'suggestion'),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: this.calculateCost(inputTokens, outputTokens, model)
        },
        model
      };
    } catch (error) {
      console.error('Anthropic suggestion error:', error);
      return this._generateMockResponse(partialData, 'suggestion');
    }
  }

  estimateTokens(text, model = 'claude-3-5-sonnet-20241022') {
    // Rough estimation: ~4 characters per token for Claude
    // This is an approximation - actual tokenization may vary
    return Math.ceil(text.length / 4);
  }

  _registerAllModels() {
    // Current Production Models
    this._registerModel('claude-3-5-sonnet-20241022', {
      name: 'Claude 3.5 Sonnet',
      description: 'Most intelligent model, balanced performance and speed',
      pricing: { input: 3.00, output: 15.00 },
      contextLength: 200000,
      capabilities: ['analysis', 'optimization', 'reasoning', 'code'],
      speed: 'fast',
      quality: 'excellent',
      bestFor: ['complex analysis', 'contract optimization', 'detailed reasoning']
    });

    this._registerModel('claude-3-5-haiku-20241022', {
      name: 'Claude 3.5 Haiku',
      description: 'Fastest model, great for quick tasks',
      pricing: { input: 0.25, output: 1.25 },
      contextLength: 200000,
      capabilities: ['chat', 'quick analysis', 'suggestions'],
      speed: 'very_fast',
      quality: 'good',
      bestFor: ['quick suggestions', 'chat', 'simple analysis']
    });

    this._registerModel('claude-3-opus-20240229', {
      name: 'Claude 3 Opus',
      description: 'Most capable model for complex tasks',
      pricing: { input: 15.00, output: 75.00 },
      contextLength: 200000,
      capabilities: ['advanced reasoning', 'complex analysis', 'research'],
      speed: 'slow',
      quality: 'outstanding',
      bestFor: ['complex contract analysis', 'detailed research', 'critical decisions']
    });

    this._registerModel('claude-3-sonnet-20240229', {
      name: 'Claude 3 Sonnet',
      description: 'Balanced model for most tasks',
      pricing: { input: 3.00, output: 15.00 },
      contextLength: 200000,
      capabilities: ['analysis', 'optimization', 'chat'],
      speed: 'medium',
      quality: 'very_good',
      bestFor: ['general analysis', 'optimization', 'balanced tasks']
    });

    this._registerModel('claude-3-haiku-20240307', {
      name: 'Claude 3 Haiku',
      description: 'Fast and efficient for simple tasks',
      pricing: { input: 0.25, output: 1.25 },
      contextLength: 200000,
      capabilities: ['chat', 'quick tasks'],
      speed: 'very_fast',
      quality: 'good',
      bestFor: ['quick responses', 'simple tasks', 'chat']
    });

    // Future/Beta Models (if ENABLE_BETA_MODELS is true)
    if (process.env.ENABLE_BETA_MODELS === 'true') {
      this._registerModel('claude-4-sonnet', {
        name: 'Claude 4 Sonnet',
        description: 'Next-generation flagship model with enhanced capabilities',
        pricing: { input: 5.00, output: 25.00 }, // Estimated pricing
        contextLength: 500000,
        capabilities: ['advanced reasoning', 'long context', 'multimodal'],
        speed: 'medium',
        quality: 'exceptional',
        beta: true,
        bestFor: ['complex analysis', 'long documents', 'advanced reasoning']
      });

      this._registerModel('claude-3-5-opus', {
        name: 'Claude 3.5 Opus',
        description: 'Enhanced Opus with improved capabilities',
        pricing: { input: 20.00, output: 100.00 }, // Estimated pricing
        contextLength: 200000,
        capabilities: ['expert reasoning', 'research', 'complex analysis'],
        speed: 'slow',
        quality: 'exceptional',
        beta: true,
        bestFor: ['expert analysis', 'critical decisions', 'research tasks']
      });
    }
  }

  _buildOptimizationPrompt(contractData, context) {
    return `Please analyze this Bloom Energy contract and provide optimization recommendations:

Contract Details:
- Client: ${contractData.client || 'N/A'}
- Capacity: ${contractData.capacity || 'N/A'}kW
- Term: ${contractData.term || 'N/A'} years
- System Type: ${contractData.systemType || 'N/A'}
- Base Rate: $${contractData.financial?.baseRate || 'N/A'}/kWh
- Escalation: ${contractData.financial?.escalation || 'N/A'}%/year
- Output Warranty: ${contractData.operating?.outputWarranty || 'N/A'}%
- Efficiency: ${contractData.operating?.efficiency || 'N/A'}%

Context: ${JSON.stringify(context, null, 2)}

Provide specific recommendations for:
1. Pricing optimization
2. Risk mitigation  
3. Performance improvements
4. Any red flags or concerns

Format your response as actionable bullet points.`;
  }

  _buildAnalysisPrompt(contractData) {
    return `Analyze this Bloom Energy contract for patterns and insights:

${JSON.stringify(contractData, null, 2)}

Provide analysis on:
1. Market positioning (how does this compare to typical contracts?)
2. Risk assessment
3. Unusual parameters or configurations
4. Optimization opportunities
5. Compliance with Bloom Energy standards`;
  }

  _buildSuggestionsPrompt(partialData) {
    return `Based on this partial contract information, suggest appropriate values for missing fields:

Current Data:
${JSON.stringify(partialData, null, 2)}

Please suggest:
1. Appropriate capacity if not specified
2. Recommended contract term
3. Competitive base rate
4. Suitable escalation rate
5. Technical specifications that make sense for this configuration

Consider industry standards and Bloom Energy best practices.`;
  }

  _generateMockResponse(input, context) {
    const mockResponses = {
      chat: {
        message: 'I can help you with contract optimization and analysis. What specific aspect would you like to focus on?',
        usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150, cost: 0.001 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      optimization: {
        message: `Based on the contract parameters, I recommend optimizing the pricing structure and considering longer terms for better economics.`,
        suggestions: [
          'Consider negotiating base rate based on market conditions',
          'Evaluate extending contract term for better economics',
          'Review escalation rate alignment with inflation projections'
        ],
        actions: [
          {
            type: 'optimize_pricing',
            label: 'Apply Pricing Recommendations',
            data: { reasoning: 'Mock recommendation - API not configured' }
          }
        ],
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.003 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      analysis: {
        message: 'Contract analysis shows standard parameters within typical ranges for this system size and application.',
        insights: ['Standard contract configuration', 'Competitive pricing structure'],
        alerts: [],
        riskScore: 25,
        usage: { inputTokens: 150, outputTokens: 150, totalTokens: 300, cost: 0.003 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      },
      suggestion: {
        message: 'Based on similar contracts, here are my suggestions for the missing parameters.',
        suggestions: {
          capacity: '975kW (3 servers of 325kW each)',
          term: '15 years (optimal balance of economics and flexibility)',
          baseRate: '$0.135/kWh (competitive market rate)',
          escalation: '2.5%/year (aligned with inflation expectations)'
        },
        confidence: 0.7,
        usage: { inputTokens: 80, outputTokens: 120, totalTokens: 200, cost: 0.002 },
        model: 'mock',
        provider: this.name,
        timestamp: new Date().toISOString()
      }
    };

    return mockResponses[context] || mockResponses.chat;
  }
}